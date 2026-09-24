import { randomUUID } from 'node:crypto';

import type { AnnotationAnchor, AnnotationMessage, AnnotationThread, NewMessage, ThreadStatus } from '../types.ts';

export interface CreateInput {
  anchor: AnnotationAnchor;
  storyTitle?: string;
  message: NewMessage;
}

/**
 * The persistence boundary. A future Firebase/manual backend implements this
 * same interface; a future MCP toolset wraps it. `createJsonlStore` is the only
 * implementation built now.
 */
export interface AnnotationStore {
  list(storyId?: string): Promise<AnnotationThread[]>;
  create(input: CreateInput): Promise<AnnotationThread>;
  reply(id: string, message: NewMessage): Promise<AnnotationThread>;
  setStatus(id: string, status: ThreadStatus): Promise<AnnotationThread>;
  remove(id: string): Promise<void>;
}

function makeMessage(input: NewMessage): AnnotationMessage {
  const message: AnnotationMessage = {
    id: randomUUID(),
    author: input.author,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  if (input.authorName !== undefined) message.authorName = input.authorName;
  return message;
}

/** Build a fresh thread: status `open`, a single root message, matching timestamps. */
export function newThread(input: CreateInput): AnnotationThread {
  const now = new Date().toISOString();
  const thread: AnnotationThread = {
    id: randomUUID(),
    anchor: input.anchor,
    status: 'open',
    messages: [makeMessage(input.message)],
    createdAt: now,
    updatedAt: now,
  };
  if (input.storyTitle !== undefined) thread.storyTitle = input.storyTitle;
  return thread;
}

/** Append a reply and bump `updatedAt`; never mutates the input thread. */
export function applyReply(thread: AnnotationThread, message: NewMessage): AnnotationThread {
  return {
    ...thread,
    messages: [...thread.messages, makeMessage(message)],
    updatedAt: new Date().toISOString(),
  };
}

/** Set thread status and bump `updatedAt`; never mutates the input thread. */
export function withStatus(thread: AnnotationThread, status: ThreadStatus): AnnotationThread {
  return { ...thread, status, updatedAt: new Date().toISOString() };
}
