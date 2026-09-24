import React, { useEffect, useReducer } from 'react';

import { anchorKeyFromClickTarget, pinPixelInRect, pointInRect, resolveAnchorElement } from '../anchor.ts';
import { EVENTS } from '../constants.ts';
import type { AnnotationGesturePayload, AnnotationThread } from '../types.ts';

export interface OverlayProps {
  canvasElement: HTMLElement;
  storyId: string;
  active: boolean;
  threads: AnnotationThread[];
  revealThreadId?: string;
  emit: (
    event: string,
    payload: AnnotationGesturePayload | { storyId: string; orphanThreadIds: string[] } | { threadId: string },
  ) => void;
}

interface PlacedPin {
  thread: AnnotationThread;
  left: number;
  top: number;
}

const OPEN_COLOR = '#e11d48';
const RESOLVED_COLOR = '#6b7280';

/**
 * Presentation-only overlay drawn above `context.canvasElement`. It never reads
 * storage: it renders one pin per thread from live DOM rects, and — while
 * annotate mode is active — captures canvas clicks to emit a create gesture.
 */
export function Overlay({
  canvasElement,
  storyId,
  active,
  threads,
  revealThreadId,
  emit,
}: OverlayProps): React.ReactElement {
  const [, reposition] = useReducer((tick: number) => tick + 1, 0);

  // Keep pins aligned as the canvas resizes or the page scrolls.
  useEffect(() => {
    const observer = new ResizeObserver(() => reposition());
    observer.observe(canvasElement);
    const onViewportChange = () => reposition();
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [canvasElement]);

  // Capture clicks to place an anchor while annotate mode is active.
  useEffect(() => {
    if (!active) return undefined;
    const previousCursor = canvasElement.style.cursor;
    canvasElement.style.cursor = 'crosshair';
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target instanceof Element ? event.target : null;
      const elementKey = anchorKeyFromClickTarget(target, canvasElement);
      const anchorElement = resolveAnchorElement(canvasElement, elementKey) ?? canvasElement;
      const point = pointInRect(event.clientX, event.clientY, anchorElement.getBoundingClientRect());
      const payload: AnnotationGesturePayload = { storyId, elementKey, point };
      emit(EVENTS.CREATE_GESTURE, payload);
    };
    canvasElement.addEventListener('click', onClick, true);
    return () => {
      canvasElement.style.cursor = previousCursor;
      canvasElement.removeEventListener('click', onClick, true);
    };
  }, [active, canvasElement, storyId, emit]);

  // Scroll a revealed thread's anchor into view.
  useEffect(() => {
    if (revealThreadId === undefined) return;
    const thread = threads.find((candidate) => candidate.id === revealThreadId);
    if (!thread) return;
    resolveAnchorElement(canvasElement, thread.anchor.elementKey)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    reposition();
  }, [revealThreadId, threads, canvasElement]);

  const origin = canvasElement.getBoundingClientRect();
  const pins: PlacedPin[] = [];
  const orphanThreadIds: string[] = [];
  for (const thread of threads) {
    const anchorElement = resolveAnchorElement(canvasElement, thread.anchor.elementKey);
    if (!anchorElement) {
      orphanThreadIds.push(thread.id);
      continue;
    }
    const pixel = pinPixelInRect(anchorElement.getBoundingClientRect(), thread.anchor.point);
    pins.push({ thread, left: pixel.x - origin.left, top: pixel.y - origin.top });
  }

  // Report orphaned anchors so the panel can flag "target unavailable".
  const orphanKey = orphanThreadIds.join(',');
  useEffect(() => {
    emit(EVENTS.ORPHAN_REPORT, { storyId, orphanThreadIds: orphanKey ? orphanKey.split(',') : [] });
  }, [orphanKey, storyId, emit]);

  return (
    <div
      aria-hidden={!active}
      style={{
        position: 'fixed',
        left: origin.left,
        top: origin.top,
        width: origin.width,
        height: origin.height,
        pointerEvents: 'none',
        zIndex: 2147483000,
        background: active ? 'rgba(225,29,72,0.04)' : 'transparent',
      }}
    >
      {pins.map(({ thread, left, top }) => {
        const resolved = thread.status === 'resolved';
        const preview = thread.messages[0]?.body ?? '';
        const revealed = thread.id === revealThreadId;
        return (
          <button
            key={thread.id}
            type="button"
            title={preview}
            aria-label={`Annotation: ${preview}`}
            onClick={() => emit(EVENTS.ACTIVATE_PIN, { threadId: thread.id })}
            style={{
              position: 'absolute',
              left,
              top,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '2px solid #fff',
              background: resolved ? RESOLVED_COLOR : OPEN_COLOR,
              color: '#fff',
              fontSize: 11,
              lineHeight: '16px',
              cursor: 'pointer',
              boxShadow: revealed ? '0 0 0 6px rgba(225,29,72,0.35)' : '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {resolved ? '\u2713' : '\u25CF'}
          </button>
        );
      })}
    </div>
  );
}
