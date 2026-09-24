import { API_BASE } from '../constants.ts';
import type { AnnotationAnchor, AnnotationThread, NewMessage, ThreadStatus } from '../types.ts';

const JSON_HEADERS = { 'content-type': 'application/json' };

/** Same-origin fetch against Storybook's own dev server. Non-2xx throws so the panel can show an inline error (no optimistic success). */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_BASE + path, init);
  if (!response.ok) throw new Error(`annotations-api-${response.status}`);
  const data: T = await response.json();
  return data;
}

export function listThreads(storyId?: string): Promise<AnnotationThread[]> {
  const query = storyId ? `?storyId=${encodeURIComponent(storyId)}` : '';
  return request<AnnotationThread[]>(`/threads${query}`);
}

export function createThread(input: {
  anchor: AnnotationAnchor;
  storyTitle?: string;
  message: NewMessage;
}): Promise<AnnotationThread> {
  return request<AnnotationThread>('/threads', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function replyThread(id: string, message: NewMessage): Promise<AnnotationThread> {
  return request<AnnotationThread>('/threads/reply', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, message }),
  });
}

export function setThreadStatus(id: string, status: ThreadStatus): Promise<AnnotationThread> {
  return request<AnnotationThread>('/threads/status', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, status }),
  });
}

export function deleteThread(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/threads?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Build a link/download URL for the portable export endpoints. */
export function exportUrl(format: 'jsonl' | 'mdx', storyId?: string): string {
  const query = storyId ? `?storyId=${encodeURIComponent(storyId)}` : '';
  return `${API_BASE}/export.${format}${query}`;
}
