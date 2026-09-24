import React from 'react';
import type { Decorator } from '@storybook/react-vite';
import { useChannel, useEffect, useState } from 'storybook/preview-api';

import { Overlay } from './components/Overlay.tsx';
import { EVENTS, GLOBAL_KEY, PARAM_KEY } from './constants.ts';
import type { AnnotationsParameters, AnnotationThread } from './types.ts';

/**
 * Global decorator that renders the annotate overlay above every story. Mode is
 * read from a Storybook global (URL-shareable); thread data arrives over the
 * addon channel from the manager. The decorator never touches storage.
 */
const withAnnotations: Decorator = (storyFn, context) => {
  const params: AnnotationsParameters = context.parameters[PARAM_KEY] ?? {};
  const disabled = params.disable === true;
  const active = !disabled && context.globals[GLOBAL_KEY] === 'on';

  const [threads, setThreads] = useState<AnnotationThread[]>([]);
  const [revealThreadId, setRevealThreadId] = useState<string | undefined>(undefined);

  const emit = useChannel({
    [EVENTS.PRESENT_THREADS]: (payload: { storyId: string; threads: AnnotationThread[] }) => {
      if (payload.storyId === context.id) setThreads(payload.threads);
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

  return (
    <>
      {storyFn()}
      <Overlay
        canvasElement={context.canvasElement}
        storyId={context.id}
        active={active}
        threads={threads}
        revealThreadId={revealThreadId}
        emit={emit}
      />
    </>
  );
};

export const decorators: Decorator[] = [withAnnotations];
export const initialGlobals = { [GLOBAL_KEY]: 'off' };

const preview = { decorators, initialGlobals };
export default preview;
