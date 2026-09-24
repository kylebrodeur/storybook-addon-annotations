import React, { useEffect, useReducer } from 'react';

import {
  anchorKeyFromClickTarget,
  pinPixelInRect,
  pointInRect,
  rectInRect,
  resolveAnchorElement,
  textRangeAnchorFromSelection,
} from '../anchor.ts';
import { EVENTS } from '../constants.ts';
import type { AnnotationAnchor, AnnotationGesturePayload, AnnotationThread } from '../types.ts';

export interface OverlayProps {
  canvasElement: HTMLElement;
  storyId: string;
  active: boolean;
  threads: AnnotationThread[];
  draft?: AnnotationGesturePayload | null;
  revealThreadId?: string;
  emit: (
    event: string,
    payload:
      | AnnotationAnchor
      | { storyId: string; orphanThreadIds: string[] }
      | { threadId: string }
      | { threadId: string; anchor: AnnotationAnchor }
      | null,
  ) => void;
}

interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PlacedPin {
  thread: AnnotationThread;
  number: number;
  left: number;
  top: number;
}

const OPEN_COLOR = '#e11d48';
const RESOLVED_COLOR = '#6b7280';
const DRAFT_COLOR = '#f59e0b';

export function Overlay({
  canvasElement,
  storyId,
  active,
  threads,
  draft,
  revealThreadId,
  emit,
}: OverlayProps): React.ReactElement {
  const [, reposition] = useReducer((tick: number) => tick + 1, 0);

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
      const selection = window.getSelection();
      const textAnchor = selection ? textRangeAnchorFromSelection(selection, storyId, elementKey, anchorElement) : null;
      const anchor: AnnotationAnchor = textAnchor ?? {
        kind: 'point',
        storyId,
        elementKey,
        point: pointInRect(event.clientX, event.clientY, anchorElement.getBoundingClientRect()),
        rect: rectInRect(anchorElement.getBoundingClientRect(), canvasElement.getBoundingClientRect()),
      };
      emit(EVENTS.CREATE_GESTURE, anchor);
    };
    canvasElement.addEventListener('click', onClick, true);
    return () => {
      canvasElement.style.cursor = previousCursor;
      canvasElement.removeEventListener('click', onClick, true);
    };
  }, [active, canvasElement, storyId, emit]);

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
  const boxes: Array<{ key: string; rect: OverlayRect; textRects: OverlayRect[] }> = [];
  for (const [index, thread] of threads.entries()) {
    const anchorElement = resolveAnchorElement(canvasElement, thread.anchor.elementKey);
    if (!anchorElement) {
      orphanThreadIds.push(thread.id);
      continue;
    }
    const anchorRect = anchorElement.getBoundingClientRect();
    const pixel = pinPixelInRect(anchorRect, thread.anchor.point);
    pins.push({ thread, number: index + 1, left: pixel.x - origin.left, top: pixel.y - origin.top });
    const textRects: OverlayRect[] = [];
    if (thread.anchor.kind === 'text-range') {
      for (const fraction of thread.anchor.rangeRects) {
        textRects.push({
          left: anchorRect.left + fraction.xFraction * anchorRect.width,
          top: anchorRect.top + fraction.yFraction * anchorRect.height,
          width: fraction.widthFraction * anchorRect.width,
          height: fraction.heightFraction * anchorRect.height,
        });
      }
    }
    boxes.push({ key: thread.id, rect: anchorRect, textRects });
  }

  const draftPin = draft
    ? (() => {
        const anchorElement = resolveAnchorElement(canvasElement, draft.elementKey) ?? canvasElement;
        const pixel = pinPixelInRect(anchorElement.getBoundingClientRect(), draft.point);
        return { left: pixel.x - origin.left, top: pixel.y - origin.top };
      })()
    : null;

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
      {boxes.map(({ key, rect, textRects }) => (
        <React.Fragment key={key}>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              border: '1px dashed rgba(225,29,72,0.65)',
              background: 'rgba(225,29,72,0.05)',
              pointerEvents: 'none',
            }}
          />
          {textRects.map((textRect, index) => (
            <div
              key={`${key}-text-${index}`}
              aria-hidden="true"
              style={{
                position: 'fixed',
                left: textRect.left,
                top: textRect.top,
                width: textRect.width,
                height: textRect.height,
                background: 'rgba(245,158,11,0.35)',
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            />
          ))}
        </React.Fragment>
      ))}
      {draftPin !== null && (
        <span
          aria-label="Unsaved annotation pin"
          style={{
            position: 'absolute',
            left: draftPin.left,
            top: draftPin.top,
            transform: 'translate(-50%, -50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '2px solid #fff',
            background: DRAFT_COLOR,
            color: '#111827',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: '18px',
            boxShadow: '0 0 0 6px rgba(245,158,11,0.28)',
          }}
        >
          +
        </span>
      )}
      {pins.map(({ thread, number, left, top }) => {
        const resolved = thread.status === 'resolved';
        const preview = thread.messages[0]?.body ?? '';
        const revealed = thread.id === revealThreadId;
        return (
          <button
            key={thread.id}
            type="button"
            title={`${number}: ${preview}`}
            aria-label={`Annotation ${number}: ${preview}`}
            data-thread-id={thread.id}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              emit(EVENTS.ACTIVATE_PIN, { threadId: thread.id });
            }}
            onPointerDown={(event) => {
              if (!active) return;
              event.preventDefault();
              event.stopPropagation();
              const anchorElement = resolveAnchorElement(canvasElement, thread.anchor.elementKey) ?? canvasElement;
              const point = pointInRect(event.clientX, event.clientY, anchorElement.getBoundingClientRect());
              emit(EVENTS.MOVE_PIN, { threadId: thread.id, anchor: { ...thread.anchor, point } });
            }}
            style={{
              position: 'absolute',
              left,
              top,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid #fff',
              background: resolved ? RESOLVED_COLOR : OPEN_COLOR,
              color: '#fff',
              fontSize: 11,
              lineHeight: '20px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: revealed ? '0 0 0 6px rgba(225,29,72,0.35)' : '0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            {number}
          </button>
        );
      })}
    </div>
  );
}
