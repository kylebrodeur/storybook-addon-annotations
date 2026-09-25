import type { ThreadStatus } from '../types.ts';

export type SelectableThread = { id: string; status: ThreadStatus };

export function selectionAction(statuses: ThreadStatus[]): ThreadStatus {
  return statuses.length > 0 && statuses.every((status) => status === 'resolved') ? 'open' : 'resolved';
}
export function nextSelection(current: Set<string>, threadId: string, allThreadIds?: string[]): Set<string> {
  const next = new Set(current);
  if (next.has(threadId)) {
    next.delete(threadId);
    return next;
  }
  next.add(threadId);
  if (allThreadIds !== undefined && allThreadIds.every((id) => next.has(id))) return next;
  return next;
}

export function bulkStatusForSelection(
  threads: SelectableThread[],
  selectedIds: Set<string>,
  status: ThreadStatus,
): SelectableThread[] {
  return threads.map((thread) => (selectedIds.has(thread.id) ? { ...thread, status } : thread));
}
