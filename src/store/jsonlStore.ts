import { promises as fs } from 'node:fs';

import type { AnnotationThread } from '../types.ts';
import type { AnnotationStore } from './store.ts';
import { applyReply, newThread, withAnchor, withStatus } from './store.ts';

/** Read the flat store, one JSON thread object per line; corrupt lines are skipped, never fatal. */
async function readAll(filePath: string): Promise<AnnotationThread[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    // SAFETY: Node's fs.readFile rejection is the documented filesystem error shape.
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return [];
    throw error;
  }
  const threads: AnnotationThread[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      // SAFETY: JSON.parse is followed by the store's line-level corruption policy; invalid lines are caught and skipped.
      threads.push(JSON.parse(trimmed) as AnnotationThread);
    } catch {
      console.warn(`[annotations] skipping corrupt store line: ${trimmed.slice(0, 80)}`);
    }
  }
  return threads;
}

/** Serialize one thread per line and write atomically via a temp file + rename. */
async function writeAll(filePath: string, threads: AnnotationThread[]): Promise<void> {
  const body = threads.length ? threads.map((thread) => JSON.stringify(thread)).join('\n') + '\n' : '';
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  await fs.rename(tmp, filePath);
}

/**
 * Single-process JSONL store with serialized mutations.
 *
 * Every mutation re-reads then rewrites the whole file, so two concurrent
 * mutations would each see the same snapshot and the later write would silently
 * drop the earlier one. Each store instance therefore chains its mutations:
 * one read-modify-write completes before the next begins, so parallel calls
 * queue instead of racing. Reads stay lock-free and always see a consistent
 * on-disk snapshot.
 */
export function createJsonlStore(filePath: string): AnnotationStore {
  /** Tail of the mutation chain; the next mutation awaits it before touching the file. */
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(mutation: () => Promise<T>): Promise<T> => {
    const run = chain.then(mutation, mutation);
    chain = run.catch(() => undefined);
    return run;
  };

  return {
    async list(storyId?: string) {
      const all = await readAll(filePath);
      return storyId ? all.filter((thread) => thread.anchor.storyId === storyId) : all;
    },
    async create(input) {
      return serialize(async () => {
        const all = await readAll(filePath);
        const thread = newThread(input);
        all.push(thread);
        await writeAll(filePath, all);
        return thread;
      });
    },
    async reply(id, message) {
      return serialize(async () => {
        const all = await readAll(filePath);
        const index = all.findIndex((thread) => thread.id === id);
        const current = index === -1 ? undefined : all[index];
        if (!current) throw new Error('thread-not-found');
        const updated = applyReply(current, message);
        all[index] = updated;
        await writeAll(filePath, all);
        return updated;
      });
    },
    async setStatus(id, status) {
      return serialize(async () => {
        const all = await readAll(filePath);
        const index = all.findIndex((thread) => thread.id === id);
        const current = index === -1 ? undefined : all[index];
        if (!current) throw new Error('thread-not-found');
        const updated = withStatus(current, status);
        all[index] = updated;
        await writeAll(filePath, all);
        return updated;
      });
    },
    async setAnchor(id, anchor) {
      return serialize(async () => {
        const all = await readAll(filePath);
        const index = all.findIndex((thread) => thread.id === id);
        const current = index === -1 ? undefined : all[index];
        if (!current) throw new Error('thread-not-found');
        const updated = withAnchor(current, anchor);
        all[index] = updated;
        await writeAll(filePath, all);
        return updated;
      });
    },
    async remove(id) {
      return serialize(async () => {
        const all = await readAll(filePath);
        const next = all.filter((thread) => thread.id !== id);
        if (next.length === all.length) throw new Error('thread-not-found');
        await writeAll(filePath, next);
      });
    },
  };
}
