import { STORY_ROOT_KEY } from '../constants.ts';
import type { AnnotationThread } from '../types.ts';

/** Portable store format: one parseable JSON thread object per line (same as on disk). */
export function toJsonl(threads: AnnotationThread[]): string {
  return threads.map((thread) => JSON.stringify(thread)).join('\n');
}

/**
 * CommonMark only (no JSX/HTML) so the output is valid `.md`/`.mdx`/`.mdc`.
 * `# Annotations` title, `##` section per story (by `storyTitle` else storyId),
 * a `###` per thread with anchor label + status, then one bullet per message.
 */
export function toMarkdown(threads: AnnotationThread[]): string {
  const groups = new Map<string, AnnotationThread[]>();
  for (const thread of threads) {
    const key = thread.storyTitle ?? thread.anchor.storyId;
    const bucket = groups.get(key) ?? [];
    bucket.push(thread);
    groups.set(key, bucket);
  }

  const lines: string[] = ['# Annotations', ''];
  for (const [title, group] of groups) {
    lines.push(`## ${title}`, '');
    for (const thread of group) {
      const anchorLabel = thread.anchor.elementKey === STORY_ROOT_KEY ? 'Whole component' : thread.anchor.elementKey;
      const statusLabel = thread.status === 'open' ? '[open]' : '[resolved]';
      lines.push(`### ${anchorLabel} ${statusLabel}`, '');
      for (const message of thread.messages) {
        const name = message.authorName ?? message.author;
        lines.push(`- **${name}** _(${message.author}, ${message.createdAt})_: ${message.body}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}
