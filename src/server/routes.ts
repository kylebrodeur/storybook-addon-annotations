import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';

import { API_BASE } from '../constants.ts';
import { toJsonl, toMarkdown } from '../export/render.ts';
import type {
  AnnotationCreateRequest,
  AnnotationReplyRequest,
  AnnotationStatusRequest,
  AnnotationThread,
} from '../types.ts';
import type { AnnotationStore } from '../store/store.ts';

export interface DevServerRequest extends IncomingMessage {
  originalUrl?: string;
}

export interface DevServerApp {
  use(path: string, handler: (req: DevServerRequest, res: ServerResponse) => void): void;
}

const anchorSchema = z.object({
  storyId: z.string().min(1),
  elementKey: z.string(),
  point: z.object({ xFraction: z.number().finite(), yFraction: z.number().finite() }),
});
const messageSchema = z.object({
  author: z.enum(['human', 'agent']),
  authorName: z.string().optional(),
  body: z.string().trim().min(1),
});
const createSchema = z.object({ anchor: anchorSchema, storyTitle: z.string().optional(), message: messageSchema });
const replySchema = z.object({ id: z.string(), message: messageSchema });
const statusSchema = z.object({ id: z.string(), status: z.enum(['open', 'resolved']) });
const jsonSchema = z.record(z.unknown());

type ParsedJson = z.infer<typeof jsonSchema>;
type ResponseBody = AnnotationThread[] | AnnotationThread | { ok: true } | { error: string; message?: string };

function sendJson(res: ServerResponse, status: number, data: ResponseBody): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(data));
}

function sendText(res: ServerResponse, status: number, contentType: string, body: string): void {
  res.statusCode = status;
  res.setHeader('content-type', contentType);
  res.end(body);
}

async function readJsonBody(req: IncomingMessage): Promise<ParsedJson> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return {};
  const parsed = jsonSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  return parsed.success ? parsed.data : {};
}

function isNotFound(error: Error): boolean {
  return error.message === 'thread-not-found';
}

export function mountRoutes(app: DevServerApp, store: AnnotationStore): void {
  app.use(API_BASE, (req, res) => {
    void handle(req, res, store);
  });
}

async function handle(req: DevServerRequest, res: ServerResponse, store: AnnotationStore): Promise<void> {
  try {
    const raw = req.originalUrl ?? req.url ?? '/';
    const url = new URL(raw, 'http://localhost');
    const path = url.pathname.startsWith(API_BASE) ? url.pathname.slice(API_BASE.length) : url.pathname;
    const storyId = url.searchParams.get('storyId') ?? undefined;
    const method = req.method ?? 'GET';

    if (method === 'GET' && path === '/threads') {
      sendJson(res, 200, await store.list(storyId));
      return;
    }
    if (method === 'GET' && path === '/export.jsonl') {
      sendText(res, 200, 'application/x-ndjson', toJsonl(await store.list(storyId)));
      return;
    }
    if (method === 'GET' && path === '/export.mdx') {
      sendText(res, 200, 'text/markdown', toMarkdown(await store.list(storyId)));
      return;
    }
    if (method === 'DELETE' && path === '/threads') {
      const id = url.searchParams.get('id') ?? '';
      try {
        await store.remove(id);
      } catch (error) {
        if (!(error instanceof Error) || !isNotFound(error)) throw error;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    const body = await readJsonBody(req);
    if (method === 'POST' && path === '/threads') {
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'invalid' });
        return;
      }
      const request: AnnotationCreateRequest = parsed.data;
      sendJson(res, 201, await store.create(request));
      return;
    }
    if (method === 'POST' && path === '/threads/reply') {
      const parsed = replySchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'invalid' });
        return;
      }
      const request: AnnotationReplyRequest = parsed.data;
      try {
        sendJson(res, 200, await store.reply(request.id, request.message));
      } catch (error) {
        if (!(error instanceof Error) || !isNotFound(error)) throw error;
        sendJson(res, 404, { error: 'thread-not-found' });
      }
      return;
    }
    if (method === 'PATCH' && path === '/threads/status') {
      const parsed = statusSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'invalid' });
        return;
      }
      const request: AnnotationStatusRequest = parsed.data;
      try {
        sendJson(res, 200, await store.setStatus(request.id, request.status));
      } catch (error) {
        if (!(error instanceof Error) || !isNotFound(error)) throw error;
        sendJson(res, 404, { error: 'thread-not-found' });
      }
      return;
    }

    sendJson(res, 404, { error: 'not-found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    sendJson(res, 500, { error: 'internal', message });
  }
}
