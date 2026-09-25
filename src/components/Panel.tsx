import React, { useEffect, useState } from 'react';
import { useAddonState, useChannel, useParameter, useStorybookApi } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import type { StorybookTheme } from 'storybook/theming';

import {
  createThread,
  deleteThread,
  exportUrl,
  listThreads,
  replyThread,
  setThreadAnchor,
  setThreadStatus,
  setupProject,
} from '../client/api.ts';
import { enableAnnotationMode } from '../annotateMode.ts';
import { ADDON_ID, EVENTS, PARAM_KEY, STORY_ROOT_KEY } from '../constants.ts';
import { formatAnnotationTimestamp } from '../format.ts';
import {
  ONBOARDING_PERSISTENCE,
  ONBOARDING_STATE_DEFAULTS,
  dismissOnboarding,
  shouldShowOnboarding,
} from '../onboarding.ts';
import { refreshStatuses } from '../manager/status.ts';
import { nextSelection, selectionAction } from './bulkSelection.ts';
import type {
  AnnotationAnchor,
  AnnotationGesturePayload,
  AnnotationThread,
  AnnotationsAddonState,
  AnnotationsParameters,
} from '../types.ts';

type ThreadMutation = (result: AnnotationThread) => AnnotationThread[];
type DeleteMutation = (result: { ok: true }) => AnnotationThread[];
type DraftRequest = {
  anchor: AnnotationAnchor;
  storyTitle?: string;
  message: { author: 'human'; authorName: string; body: string };
};

function buttonStyle(variant: 'solid' | 'outline' | 'danger', theme: StorybookTheme): React.CSSProperties {
  const base: React.CSSProperties = {
    minHeight: 28,
    padding: '5px 10px',
    border: `1px solid ${theme.appBorderColor}`,
    borderRadius: theme.appBorderRadius,
    font: 'inherit',
    fontSize: 12,
    lineHeight: 1.2,
    cursor: 'pointer',
  };
  if (variant === 'solid') {
    return {
      ...base,
      borderColor: theme.color.primary,
      background: theme.color.primary,
      color: theme.color.lightest,
    };
  }
  if (variant === 'danger') {
    return {
      ...base,
      borderColor: theme.color.negative,
      background: 'transparent',
      color: theme.color.negative,
    };
  }
  return {
    ...base,
    background: 'transparent',
    color: theme.color.defaultText,
  };
}

export function Panel(): React.ReactElement {
  const theme = useTheme();
  const api = useStorybookApi();
  const params = useParameter<AnnotationsParameters>(PARAM_KEY, {});
  const [addonState, setAddonState] = useAddonState<AnnotationsAddonState>(ADDON_ID, ONBOARDING_STATE_DEFAULTS);
  const dismissOnboardingCard = (): void => {
    void setAddonState(dismissOnboarding, ONBOARDING_PERSISTENCE);
  };
  const currentUser = params.currentUser ?? 'You';
  const current = api.getCurrentStoryData();
  const storyId = current?.id;
  const storyTitle = current?.title;

  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState<AnnotationAnchor | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | undefined>(undefined);
  const [, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = (): void => setReloadToken((token) => token + 1);
  const runMoveMutation = async (threadId: string, anchor: AnnotationAnchor): Promise<void> => {
    try {
      const result = await setThreadAnchor(threadId, anchor);
      const nextThreads = threads.map((thread) => (thread.id === result.id ? result : thread));
      setThreads(nextThreads);
      if (storyId !== undefined) emit(EVENTS.PRESENT_THREADS, { storyId, threads: nextThreads });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
    }
  };
  const emit = useChannel({
    [EVENTS.REQUEST_THREADS]: (payload: { storyId: string }) => {
      if (payload.storyId === storyId) reload();
    },
    [EVENTS.CREATE_GESTURE]: (payload: AnnotationGesturePayload) => {
      setDraft(payload);
      setDraftBody('');
      setError(null);
      emit(EVENTS.PRESENT_DRAFT, payload);
    },
    [EVENTS.ACTIVATE_PIN]: (payload: { threadId: string }) => {
      setExpandedId(payload.threadId);
      emit(EVENTS.REVEAL_THREAD, { threadId: payload.threadId });
      document.getElementById(`annotation-thread-${payload.threadId}`)?.scrollIntoView({ block: 'center' });
    },
    [EVENTS.MOVE_PIN]: (payload: { threadId: string; anchor: AnnotationAnchor }) => {
      void runMoveMutation(payload.threadId, payload.anchor);
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
        setThreads(loaded);
        setSelectedIds(
          (currentSelection) =>
            new Set([...currentSelection].filter((id) => loaded.some((thread) => thread.id === id))),
        );
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
  }, [emit, reloadToken, storyId]);
  const publishThreads = (nextThreads: AnnotationThread[]): void => {
    setThreads(nextThreads);
    if (storyId !== undefined) emit(EVENTS.PRESENT_THREADS, { storyId, threads: nextThreads });
    emit(EVENTS.PRESENT_DRAFT, null);
    void refreshStatuses();
  };
  const runThreadMutation = async (
    mutation: () => Promise<AnnotationThread>,
    update: ThreadMutation,
  ): Promise<boolean> => {
    try {
      const result = await mutation();
      setError(null);
      publishThreads(update(result));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
      return false;
    }
  };

  const runBulkStatusMutation = async (): Promise<void> => {
    const selected = threads.filter((thread) => selectedIds.has(thread.id));
    if (selected.length === 0) return;
    const nextStatus = selectionAction(selected.map((thread) => thread.status));
    try {
      const results = await Promise.all(selected.map((thread) => setThreadStatus(thread.id, nextStatus)));
      const resultById = new Map(results.map((thread) => [thread.id, thread]));
      const nextThreads = threads.map((thread) => resultById.get(thread.id) ?? thread);
      setError(null);
      publishThreads(nextThreads);
      setSelectedIds(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
    }
  };

  const toggleSelected = (threadId: string): void => {
    setSelectedIds((currentSelection) => nextSelection(currentSelection, threadId));
  };

  const runDeleteMutation = async (mutation: () => Promise<{ ok: true }>, update: DeleteMutation): Promise<boolean> => {
    try {
      const result = await mutation();
      setError(null);
      publishThreads(update(result));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'annotations-request-failed');
      return false;
    }
  };

  const saveDraft = async (): Promise<void> => {
    if (!draft || draftBody.trim().length === 0) return;
    const request: DraftRequest = {
      anchor: draft,
      message: { author: 'human', authorName: currentUser, body: draftBody.trim() },
    };
    if (storyTitle !== undefined) request.storyTitle = storyTitle;
    const saved = await runThreadMutation(
      async () => createThread(request),
      (result) => [...threads, result],
    );
    if (saved) {
      setDraft(null);
      setDraftBody('');
    }
  };
  const runProjectSetup = async (): Promise<void> => {
    if (
      !window.confirm(
        'Set up Annotations in this Storybook project? This will update .storybook/main.* and .gitignore.',
      )
    )
      return;
    setSetupBusy(true);
    setSetupError(null);
    setSetupMessage(null);
    try {
      const result = await setupProject();
      setSetupMessage(
        result.addonAdded || result.gitignoreUpdated
          ? 'Annotations project setup complete. Restart Storybook if the config changed.'
          : 'Annotations is already set up.',
      );
      dismissOnboardingCard();
    } catch (caught) {
      setSetupError(caught instanceof Error ? caught.message : 'annotations-setup-failed');
    } finally {
      setSetupBusy(false);
    }
  };

  const sendReply = async (threadId: string): Promise<void> => {
    const body = (replyDrafts[threadId] ?? '').trim();
    if (body.length === 0) return;
    const sent = await runThreadMutation(
      async () => replyThread(threadId, { author: 'human', authorName: currentUser, body }),
      (result) => threads.map((thread) => (thread.id === result.id ? result : thread)),
    );
    if (sent) setReplyDrafts((drafts) => ({ ...drafts, [threadId]: '' }));
  };

  const ordered = [...threads].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'inherit',
        color: 'inherit',
        fontFamily: 'var(--font-family-base, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          padding: '12px 16px',
          borderBottom: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <strong style={{ color: 'inherit', fontSize: 14, fontWeight: 600 }}>{storyTitle ?? 'Annotations'}</strong>
          <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a
              href={exportUrl('mdx', storyId)}
              target="_blank"
              rel="noreferrer"
              style={{ color: theme.color.primary, fontSize: 12 }}
            >
              Export MDX
            </a>
            <a
              href={exportUrl('jsonl', storyId)}
              target="_blank"
              rel="noreferrer"
              style={{ color: theme.color.primary, fontSize: 12 }}
            >
              Export JSONL
            </a>
          </span>
        </div>
        {ordered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={() =>
                setSelectedIds((currentSelection) =>
                  currentSelection.size === ordered.length ? new Set() : new Set(ordered.map((thread) => thread.id)),
                )
              }
              style={buttonStyle('outline', theme)}
            >
              {selectedIds.size === ordered.length ? 'Clear selection' : 'Select all'}
            </button>
            {selectedIds.size > 0 && (
              <>
                <span aria-live="polite">{selectedIds.size} selected</span>
                <button type="button" onClick={() => void runBulkStatusMutation()} style={buttonStyle('solid', theme)}>
                  {selectionAction(
                    ordered.filter((thread) => selectedIds.has(thread.id)).map((thread) => thread.status),
                  ) === 'open'
                    ? 'Reopen selected'
                    : 'Resolve selected'}
                </button>
              </>
            )}
          </div>
        )}
        {draft !== null && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveDraft();
            }}
            style={{ display: 'grid', gap: 8, marginTop: 12, padding: 12 }}
          >
            <strong>New annotation</strong>
            <textarea
              aria-label="New annotation"
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 78,
                resize: 'vertical',
                padding: '8px 10px',
                border: `1px solid ${theme.appBorderColor}`,
                borderRadius: theme.appBorderRadius,
                background: theme.background.content,
                color: theme.color.defaultText,
                font: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={draftBody.trim().length === 0} style={buttonStyle('solid', theme)}>
                Save
              </button>
              <button type="button" onClick={() => setDraft(null)} style={buttonStyle('outline', theme)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {setupMessage !== null && (
          <p role="status" style={{ margin: '10px 0 0', color: theme.color.positive }}>
            {setupMessage}
          </p>
        )}
        {setupError !== null && (
          <p role="alert" style={{ margin: '10px 0 0', color: theme.color.negative }}>
            {setupError}
          </p>
        )}
        {shouldShowOnboarding(addonState, ordered.length) && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: `1px solid ${theme.appBorderColor}`,
              borderRadius: theme.appBorderRadius,
            }}
          >
            <strong>Annotations are ready</strong>
            <p style={{ margin: '8px 0' }}>
              Set up the project first if this addon still needs to be registered. After setup, start annotating the
              current story whenever you are ready.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => void runProjectSetup()}
                disabled={setupBusy}
                style={buttonStyle('solid', theme)}
              >
                {setupBusy ? 'Setting up…' : 'Set up annotations'}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissOnboardingCard();
                  enableAnnotationMode(api);
                }}
                style={buttonStyle('outline', theme)}
              >
                Start annotating
              </button>
              <button type="button" onClick={dismissOnboardingCard} style={buttonStyle('outline', theme)}>
                Not now
              </button>
            </div>
          </div>
        )}
        {ordered.map((thread) => {
          const resolved = thread.status === 'resolved';
          const orphaned = orphanIds.includes(thread.id);
          const expanded = expandedId === thread.id;
          return (
            <div
              key={thread.id}
              id={`annotation-thread-${thread.id}`}
              style={{ marginBottom: 10, overflow: 'hidden', borderRadius: 6 }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedId(expanded ? undefined : thread.id);
                }}
                aria-expanded={expanded}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 12px',
                  border: 0,
                  color: 'inherit',
                  textAlign: 'left',
                  font: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  aria-label={`Select annotation on ${thread.anchor.elementKey}`}
                  checked={selectedIds.has(thread.id)}
                  onChange={() => toggleSelected(thread.id)}
                  onClick={(event) => event.stopPropagation()}
                />
                <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {thread.anchor.elementKey === STORY_ROOT_KEY ? 'Whole component' : thread.anchor.elementKey}
                </strong>
                <span style={{ color: resolved ? theme.color.positive : theme.color.warning, fontSize: 12 }}>
                  {thread.status}
                </span>
                {orphaned && <span style={{ color: theme.color.warning, fontSize: 12 }}> · target unavailable</span>}
                <span aria-hidden="true" style={{ marginLeft: 'auto' }}>
                  {expanded ? '▴' : '▾'}
                </span>
              </button>
              {expanded && (
                <div style={{ padding: '10px 12px 12px' }}>
                  {thread.messages.map((message) => (
                    <div key={message.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <strong>{message.authorName ?? message.author}</strong>
                        <small>{formatAnnotationTimestamp(message.createdAt)}</small>
                        {message.author === 'agent' && (
                          <span style={{ color: theme.color.primary, fontSize: 11 }}>(agent)</span>
                        )}
                      </div>
                      <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{message.body}</div>
                    </div>
                  ))}
                  <textarea
                    aria-label={`Reply to ${thread.anchor.elementKey}`}
                    value={replyDrafts[thread.id] ?? ''}
                    onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [thread.id]: event.target.value }))}
                    rows={3}
                    placeholder="Write a reply…"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minHeight: 78,
                      resize: 'vertical',
                      padding: '8px 10px',
                      border: `1px solid ${theme.appBorderColor}`,
                      borderRadius: theme.appBorderRadius,
                      background: theme.background.content,
                      color: theme.color.defaultText,
                      font: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => void sendReply(thread.id)}
                      disabled={(replyDrafts[thread.id] ?? '').trim().length === 0}
                      style={buttonStyle('solid', theme)}
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runThreadMutation(
                          async () => setThreadStatus(thread.id, resolved ? 'open' : 'resolved'),
                          (result) => threads.map((candidate) => (candidate.id === result.id ? result : candidate)),
                        )
                      }
                      style={buttonStyle('outline', theme)}
                    >
                      {resolved ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runDeleteMutation(
                          async () => deleteThread(thread.id),
                          () => threads.filter((candidate) => candidate.id !== thread.id),
                        )
                      }
                      style={buttonStyle('danger', theme)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
