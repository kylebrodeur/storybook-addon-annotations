import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import type { AnnotationAnchor } from '../types.ts';
import { createJsonlStore } from './jsonlStore.ts';
import { applyReply, newThread, withStatus } from './store.ts';

const anchor: AnnotationAnchor = {
  storyId: 'demo--default',
  elementKey: 'hero-title',
  point: { xFraction: 0.5, yFraction: 0.5 },
};

async function tempStoreFile(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'annotations-'));
  return path.join(dir, 'store.jsonl');
}

test('newThread starts open with one message and matching timestamps', () => {
  const thread = newThread({ anchor, message: { author: 'human', body: 'hi' } });
  assert.equal(thread.status, 'open');
  assert.equal(thread.messages.length, 1);
  assert.equal(thread.createdAt, thread.updatedAt);
});

test('applyReply appends a message and does not regress updatedAt', () => {
  const thread = newThread({ anchor, message: { author: 'human', body: 'hi' } });
  const replied = applyReply(thread, { author: 'agent', body: 'reply' });
  assert.equal(replied.messages.length, 2);
  assert.ok(replied.updatedAt >= thread.updatedAt);
  assert.equal(replied.messages[0]?.body, 'hi');
});

test('withStatus flips status', () => {
  const thread = newThread({ anchor, message: { author: 'human', body: 'hi' } });
  assert.equal(withStatus(thread, 'resolved').status, 'resolved');
});

test('createJsonlStore round-trips create/list/reply/setStatus/remove', async () => {
  const store = createJsonlStore(await tempStoreFile());
  const created = await store.create({ anchor, storyTitle: 'Demo', message: { author: 'human', body: 'first' } });
  assert.equal((await store.list('demo--default')).length, 1);
  assert.equal((await store.list('other-story')).length, 0);

  const replied = await store.reply(created.id, { author: 'human', body: 'second' });
  assert.equal(replied.messages.length, 2);

  const resolved = await store.setStatus(created.id, 'resolved');
  assert.equal(resolved.status, 'resolved');

  await store.remove(created.id);
  assert.equal((await store.list()).length, 0);
});

test('reply to an unknown id rejects with thread-not-found', async () => {
  const store = createJsonlStore(await tempStoreFile());
  await assert.rejects(store.reply('missing', { author: 'human', body: 'x' }), /thread-not-found/);
});

test('a corrupt middle line is skipped and valid lines still load', async () => {
  const file = await tempStoreFile();
  const store = createJsonlStore(file);
  await store.create({ anchor, message: { author: 'human', body: 'a' } });
  await store.create({ anchor, message: { author: 'human', body: 'b' } });

  const lines = (await fs.readFile(file, 'utf8')).split('\n').filter((line) => line.length > 0);
  await fs.writeFile(file, `${lines[0]}\n{ not valid json\n${lines[1]}\n`, 'utf8');

  assert.equal((await store.list()).length, 2);
});
