import React from 'react';
import type { Decorator } from '@storybook/react-vite';
import { useChannel, useGlobals, useEffect, useState } from 'storybook/preview-api';

import { annotationThemeStyle, getAnnotationTheme } from './theme.ts';
import { Overlay } from './components/Overlay.tsx';
import { EVENTS, GLOBAL_KEY, PARAM_KEY } from './constants.ts';
import type { AnnotationDraftPayload, AnnotationsParameters, AnnotationThread } from './types.ts';
const withAnnotations: Decorator = (storyFn, context) => {
  const params: AnnotationsParameters = context.parameters[PARAM_KEY] ?? {};
  const disabled = params.disable === true;
  const [globals] = useGlobals();
  const globalValue = globals?.[GLOBAL_KEY] ?? context.globals[GLOBAL_KEY];
  const active = !disabled && (globalValue === 'on' || globalValue === true);
  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [draft, setDraft] = useState<AnnotationDraftPayload | null>(null);
  const [revealThreadId, setRevealThreadId] = useState<string | undefined>(undefined);

  const emit = useChannel({
    [EVENTS.PRESENT_THREADS]: (payload: { storyId: string; threads: AnnotationThread[] }) => {
      if (payload.storyId === context.id) {
        setThreads(payload.threads);
        setDraft(null);
      }
    },
    [EVENTS.PRESENT_DRAFT]: (payload: AnnotationDraftPayload | null) => {
      if (payload === null || payload.storyId === context.id) setDraft(payload);
    },
    [EVENTS.REVEAL_THREAD]: (payload: { threadId: string }) => {
      setRevealThreadId(payload.threadId);
    },
  });

  useEffect(() => {
    if (disabled) return;
    emit(EVENTS.REQUEST_THREADS, { storyId: context.id });
  }, [context.id, disabled]);

  if (disabled) return storyFn();

  const previewTheme = getAnnotationTheme();
  return (
    // SAFETY: annotationThemeStyle returns only CSS custom properties with string values.
    <div style={annotationThemeStyle(previewTheme) as React.CSSProperties}>
      {storyFn()}
      <Overlay
        canvasElement={context.canvasElement}
        storyId={context.id}
        active={active}
        threads={threads}
        draft={draft}
        revealThreadId={revealThreadId}
        emit={emit}
      />
    </div>
  );
};

export const decorators: Decorator[] = [withAnnotations];
export const initialGlobals = { [GLOBAL_KEY]: 'off' };

const preview = { decorators, initialGlobals };
export default preview;
