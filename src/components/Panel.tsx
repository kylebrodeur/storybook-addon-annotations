import React, { useEffect, useState } from 'react';
import { useChannel, useParameter, useStorybookApi } from 'storybook/manager-api';

import { createThread, deleteThread, exportUrl, listThreads, replyThread, setThreadStatus } from '../client/api.ts';
import { EVENTS, PARAM_KEY, STORY_ROOT_KEY } from '../constants.ts';
import { refreshStatuses } from '../manager/status.ts';
import type { AnnotationAnchor, AnnotationGesturePayload, AnnotationsParameters, AnnotationThread } from '../types.ts';

export interface PanelProps {
  active: boolean;
}

type MutationResult = AnnotationThread | { ok: true };
type DraftRequest = {
  anchor: AnnotationAnchor;
  storyTitle?: string;
  message: { author: 'human'; authorName: string; body: string };
};

export function Panel(): React.ReactElement {
  const api = useStorybookApi();
  const params = useParameter<AnnotationsParameters>(PARAM_KEY, {});
  const currentUser = params.currentUser ?? 'You';
  const current = api.getCurrentStoryData();
  const storyId = current?.id;
  const storyTitle = current?.title;

  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<AnnotationAnchor | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((token) => token + 1);

  const emit = useChannel({
    [EVENTS.REQUEST_THREADS]: (payload: { storyId: string }) => {
      if (payload.storyId === storyId) reload();
    },
    [EVENTS.CREATE_GESTURE]: (payload: AnnotationGesturePayload) => {
      setDraft(payload);
      setDraftBody('');
      setError(null);
    },
    [EVENTS.ACTIVATE_PIN]: (payload: { threadId: string }) => {
      setExpandedId(payload.threadId);
      document.getElementById(`annotation-thread-${payload.threadId}`)?.scrollIntoView({ block: 'center' });
    },
    [EVENTS.ORPHAN_REPORT]: (payload: { storyId: string; orphanThreadIds: string[] }) => {
      if (payload.storyId === storyId) setOrphanIds(payload.orphanThreadIds);
    },
  });

  useEffect(() => {
    if (storyId === undefined) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await listThreads(storyId);
        if (cancelled) return;
        setThreads(loaded);
        setError(null);
        emit(EVENTS.PRESENT_THREADS, { storyId, threads: loaded });
        await refreshStatuses();
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, reloadToken, emit]);

  const runMutation = async (mutation: () => Promise<MutationResult>): Promise<void> => {
    try {
      await mutation();
      setError(null);
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
    }
  };

  const saveDraft = async (): Promise<void> => {
    if (!draft || draftBody.trim().length === 0) return;
    const request: DraftRequest = {
      anchor: draft,
      message: { author: 'human', authorName: currentUser, body: draftBody.trim() },
    };
    if (storyTitle !== undefined) request.storyTitle = storyTitle;
    await runMutation(async () => createThread(request));
    setDraft(null);
    setDraftBody('');
  };

  const sendReply = async (threadId: string): Promise<void> => {
    const body = (replyDrafts[threadId] ?? '').trim();
    if (body.length === 0) return;
    await runMutation(async () => replyThread(threadId, { author: 'human', authorName: currentUser, body }));
    setReplyDrafts((drafts) => ({ ...drafts, [threadId]: '' }));
  };

  const ordered = [...threads].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div style={{ padding: 12, fontSize: 13, lineHeight: 1.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>{storyTitle ?? 'Annotations'}</strong>
        <span style={{ display: 'flex', gap: 8 }}>
          <a href={exportUrl('mdx', storyId)} target="_blank" rel="noreferrer">
            Export MDX
          </a>
          <a href={exportUrl('jsonl', storyId)} target="_blank" rel="noreferrer">
            Export JSONL
          </a>
        </span>
      </div>
      {error !== null && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {draft !== null && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveDraft();
          }}
          style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 8, marginBottom: 8 }}
        >
          <strong>New annotation</strong>
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            rows={3}
            style={{ width: '100%', marginTop: 6 }}
          />
          <button type="submit" disabled={draftBody.trim().length === 0}>
            Save
          </button>{' '}
          <button type="button" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </form>
      )}
      {ordered.length === 0 && <p style={{ color: '#6b7280' }}>No annotations for this story.</p>}
      {ordered.map((thread) => {
        const resolved = thread.status === 'resolved';
        const orphaned = orphanIds.includes(thread.id);
        const expanded = expandedId === thread.id;
        return (
          <div
            key={thread.id}
            id={`annotation-thread-${thread.id}`}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 8, marginBottom: 8 }}
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? undefined : thread.id)}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <strong>
                {thread.anchor.elementKey === STORY_ROOT_KEY ? 'Whole component' : thread.anchor.elementKey}
              </strong>{' '}
              <span style={{ color: resolved ? '#374151' : '#b91c1c' }}>{thread.status}</span>
              {orphaned && <span style={{ color: '#b45309' }}> · target unavailable</span>}
            </button>
            {expanded && (
              <>
                {thread.messages.map((message) => (
                  <div key={message.id} style={{ marginTop: 6 }}>
                    <strong>{message.authorName ?? message.author}</strong>
                    {message.author === 'agent' && <span style={{ marginLeft: 4, color: '#6d28d9' }}>(agent)</span>}
                    <div>{message.body}</div>
                  </div>
                ))}
                <textarea
                  value={replyDrafts[thread.id] ?? ''}
                  onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [thread.id]: event.target.value }))}
                  rows={2}
                  style={{ width: '100%', marginTop: 8 }}
                />
                <button
                  type="button"
                  onClick={() => void sendReply(thread.id)}
                  disabled={(replyDrafts[thread.id] ?? '').trim().length === 0}
                >
                  Reply
                </button>{' '}
                <button
                  type="button"
                  onClick={() =>
                    void runMutation(async () => setThreadStatus(thread.id, resolved ? 'open' : 'resolved'))
                  }
                >
                  {resolved ? 'Reopen' : 'Resolve'}
                </button>{' '}
                <button type="button" onClick={() => void runMutation(async () => deleteThread(thread.id))}>
                  Delete
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
