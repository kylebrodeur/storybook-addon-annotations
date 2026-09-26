import React, { useEffect, useState } from 'react';
import { getChannel } from 'storybook/preview-api';
import { useTheme } from 'storybook/theming';

import { listThreads } from './client/api.ts';
import { EVENTS, STORY_ROOT_KEY } from './constants.ts';
import { resolveDocsSelection } from './docsSelection.ts';
import { getAnnotationTheme } from './theme.ts';
import type { AnnotationThread } from './types.ts';
import { formatAnnotationTimestamp } from './format.ts';
export interface AnnotationsBlockProps {
  storyId?: string;
  title?: string;
  onOpenThread?: (threadId: string) => void;
  emitRevealThread?: (threadId: string) => void;
}

export function Annotations({
  storyId,
  title,
  onOpenThread,
  emitRevealThread,
}: AnnotationsBlockProps): React.ReactElement {
  const theme = useTheme();
  const annotationTheme = getAnnotationTheme();
  const channel = getChannel() ?? undefined;
  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selection = resolveDocsSelection(storyId, title);

  useEffect(() => {
    if (selection.kind === 'error') return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const loaded =
          selection.kind === 'story'
            ? await listThreads(selection.storyId)
            : selection.kind === 'title'
              ? (await listThreads()).filter((thread) => thread.storyTitle === selection.title)
              : await listThreads();
        if (!cancelled) setThreads(loaded);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selection]);

  if (selection.kind === 'error') {
    return (
      <p style={{ color: annotationTheme.negative }}>
        <code>{selection.message}</code>
      </p>
    );
  }
  if (error !== null) return <p style={{ color: annotationTheme.negative }}>Error: {error}</p>;
  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        color: annotationTheme.defaultText,
        fontFamily: 'inherit',
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {threads.map((thread, index) => (
        <article
          key={thread.id}
          style={{
            overflow: 'hidden',
            border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
            borderRadius: 6,
            background: 'color-mix(in srgb, currentColor 5%, transparent)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              background: 'color-mix(in srgb, currentColor 3%, transparent)',
            }}
          >
            <strong
              style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {index + 1}. {thread.anchor.elementKey === STORY_ROOT_KEY ? 'Whole component' : thread.anchor.elementKey}
            </strong>
            <span
              style={{
                color: thread.status === 'resolved' ? annotationTheme.positive : annotationTheme.warning,
                fontSize: 12,
              }}
            >
              {thread.status}
            </span>
          </div>
          <div style={{ padding: '10px 12px 12px' }}>
            {thread.messages.map((message) => (
              <div key={message.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <strong>{message.authorName ?? message.author}</strong>
                  <small style={{ color: 'color-mix(in srgb, currentColor 62%, transparent)' }}>
                    {formatAnnotationTimestamp(message.createdAt)}
                  </small>
                  {message.author === 'agent' && (
                    <span style={{ color: annotationTheme.primary, fontSize: 11 }}>(agent)</span>
                  )}
                </div>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{message.body}</div>
              </div>
            ))}
            <button
              type="button"
              aria-label={`Open annotation ${index + 1} in the Annotations panel`}
              onClick={() => {
                onOpenThread?.(thread.id);
                if (storyId !== undefined) channel?.emit(EVENTS.OPEN_THREAD, { storyId, threadId: thread.id });
                emitRevealThread?.(thread.id);
              }}
              style={{
                minHeight: 28,
                padding: '5px 10px',
                border: `1px solid ${theme.appBorderColor}`,
                borderRadius: theme.appBorderRadius,
                background: annotationTheme.primary,
                color: annotationTheme.lightest,
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Open annotation {index + 1}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
