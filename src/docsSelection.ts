/** Docs report query selection. Shared by the generated report and the blocks renderer. */
export type DocsSelection =
  | { kind: 'all' }
  | { kind: 'story'; storyId: string }
  | { kind: 'title'; title: string }
  | { kind: 'error'; message: string };

export function resolveDocsSelection(storyId?: string, title?: string): DocsSelection {
  if (storyId !== undefined && title !== undefined) {
    return { kind: 'error', message: 'Provide exactly one of storyId or title.' };
  }
  if (storyId !== undefined) return { kind: 'story', storyId };
  if (title !== undefined) return { kind: 'title', title };
  return { kind: 'all' };
}
