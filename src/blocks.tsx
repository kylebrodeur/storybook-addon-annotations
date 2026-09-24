import React, { useEffect, useState } from 'react';

import { listThreads } from './client/api.ts';
import { STORY_ROOT_KEY } from './constants.ts';
import type { AnnotationThread } from './types.ts';

export interface AnnotationsBlockProps {
  storyId?: string;
  title?: string;
}

/**
 * Read-only Docs block. Drop into an MDX Docs page to render a component's
 * annotations. Requires exactly one of `storyId` or `title`. Deliberately
 * avoids `@storybook/blocks` internals so it stays robust across versions.
 */
export function Annotations({ storyId, title }: AnnotationsBlockProps): React.ReactElement {
  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const providedCount = (storyId ? 1 : 0) + (title ? 1 : 0);

  useEffect(() => {
    if (providedCount !== 1) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = storyId
          ? await listThreads(storyId)
          : (await listThreads()).filter((thread) => thread.storyTitle === title);
        if (!cancelled) setThreads(loaded);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, title, providedCount]);

  if (providedCount !== 1) {
    return (
      <p style={{ color: '#6b7280' }}>
        Provide exactly one of <code>storyId</code> or <code>title</code>.
      </p>
    );
  }
  if (error !== null) return <p style={{ color: '#e11d48' }}>Error: {error}</p>;
  if (threads.length === 0) return <p style={{ color: '#6b7280' }}>No annotations.</p>;

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      {threads.map((thread) => (
        <div key={thread.id} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>
              {thread.anchor.elementKey === STORY_ROOT_KEY ? 'Whole component' : thread.anchor.elementKey}
            </strong>
            <span style={{ color: thread.status === 'resolved' ? '#374151' : '#b91c1c' }}>{thread.status}</span>
          </div>
          {thread.messages.map((message) => (
            <div key={message.id} style={{ marginTop: 4 }}>
              <strong>{message.authorName ?? message.author}</strong>
              {message.author === 'agent' && <span style={{ marginLeft: 4, color: '#6d28d9' }}>(agent)</span>}
              <div>{message.body}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
