import { experimental_getStatusStore } from 'storybook/manager-api';

import { listThreads } from '../client/api.ts';
import { OPEN_STATUS_VALUE, STATUS_TYPE_ID } from '../constants.ts';

/**
 * The per-type store `experimental_getStatusStore` returns. Storybook does not
 * export this type, so it is named once here, at the only module that touches
 * the dependency.
 */
type StatusStore = ReturnType<typeof experimental_getStatusStore>;

type AnnotationStatus = {
  storyId: string;
  typeId: string;
  value: typeof OPEN_STATUS_VALUE;
  title: string;
  description: string;
};

/**
 * Recompute sidebar badges from the store: one status per story with >=1 open
 * thread (feeds Storybook's built-in status filter), and clear stories that no
 * longer have open threads.
 */
export async function refreshStatuses(): Promise<void> {
  const statusStore = experimental_getStatusStore(STATUS_TYPE_ID);
  const threads = await listThreads();

  const openByStory = new Map<string, number>();
  for (const thread of threads) {
    if (thread.status !== 'open') continue;
    openByStory.set(thread.anchor.storyId, (openByStory.get(thread.anchor.storyId) ?? 0) + 1);
  }

  const statuses: AnnotationStatus[] = [...openByStory].map(([storyId, count]) => ({
    storyId,
    typeId: STATUS_TYPE_ID,
    value: OPEN_STATUS_VALUE,
    title: 'Annotations',
    description: `${count} open comment(s)`,
  }));

  const staleStoryIds = Object.keys(statusStore.getAll()).filter((storyId) => !openByStory.has(storyId));
  try {
    statusStore.set(statuses);
    if (staleStoryIds.length > 0) statusStore.unset(staleStoryIds);
  } catch {
    // The universal store throws until the manager finishes bootstrapping
    // ("Cannot set state before store is ready"); the register callback can
    // fire first. Retry once Storybook has settled, so the first paint still
    // shows correct sidebar badges.
    setTimeout(() => void retrySet(statusStore, statuses, staleStoryIds), 500);
  }
}
async function retrySet(
  statusStore: StatusStore,
  statuses: AnnotationStatus[],
  staleStoryIds: string[],
): Promise<void> {
  try {
    statusStore.set(statuses);
    if (staleStoryIds.length > 0) statusStore.unset(staleStoryIds);
  } catch {
    // The store still is not ready; STORY_CHANGED will refresh when it is.
  }
}
