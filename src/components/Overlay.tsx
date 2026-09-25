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

const OPEN_COLOR = 'var(--storybook-annotations-primary, #ff4785)';
const RESOLVED_COLOR = 'var(--storybook-annotations-positive, #66bf3c)';
const DRAFT_COLOR = 'var(--storybook-annotations-warning, #e69d00)';
const LIGHT_TEXT_COLOR = 'var(--storybook-annotations-lightest, #ffffff)';
const DARK_TEXT_COLOR = 'var(--storybook-annotations-default-text, #1f1f1f)';
const ACTIVE_TINT = 'color-mix(in srgb, var(--storybook-annotations-primary, #ff4785) 4%, transparent)';
const BOX_BORDER = '1px dashed color-mix(in srgb, var(--storybook-annotations-primary, #ff4785) 65%, transparent)';
const BOX_FILL = 'color-mix(in srgb, var(--storybook-annotations-primary, #ff4785) 5%, transparent)';
const TEXT_RANGE_FILL = 'color-mix(in srgb, var(--storybook-annotations-warning, #e69d00) 35%, transparent)';
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
    const observer = globalThis.ResizeObserver === undefined ? null : new globalThis.ResizeObserver(() => reposition());
    observer?.observe(canvasElement);
    const onViewportChange = () => reposition();
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [canvasElement]);

  useEffect(() => {
    if (!active) return undefined;
    const previousCursor = canvasElement.style.cursor;
    let pendingSelection: Selection | null = null;
    canvasElement.style.cursor = 'crosshair';
    const onPointerUp = () => {
      const selection = window.getSelection();
      pendingSelection = selection && !selection.isCollapsed ? selection : null;
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-annotation-pin="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      const elementKey = anchorKeyFromClickTarget(target, canvasElement);
      const anchorElement = resolveAnchorElement(canvasElement, elementKey) ?? canvasElement;
      const textAnchor = pendingSelection
        ? textRangeAnchorFromSelection(pendingSelection, storyId, elementKey, anchorElement)
        : null;
      pendingSelection = null;
      const anchor: AnnotationAnchor = textAnchor ?? {
        kind: 'point',
        storyId,
        elementKey,
        point: pointInRect(event.clientX, event.clientY, anchorElement.getBoundingClientRect()),
        rect: rectInRect(anchorElement.getBoundingClientRect(), canvasElement.getBoundingClientRect()),
      };
      emit(EVENTS.CREATE_GESTURE, anchor);
    };
    canvasElement.addEventListener('pointerup', onPointerUp, true);
    canvasElement.addEventListener('click', onClick, true);
    return () => {
      canvasElement.style.cursor = previousCursor;
      canvasElement.removeEventListener('pointerup', onPointerUp, true);
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
        background: active ? ACTIVE_TINT : 'transparent',
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
              border: BOX_BORDER,
              background: BOX_FILL,
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
                background: TEXT_RANGE_FILL,
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
            border: `2px solid ${LIGHT_TEXT_COLOR}`,
            background: DRAFT_COLOR,
            color: DARK_TEXT_COLOR,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: '18px',
            boxShadow: `0 0 0 6px color-mix(in srgb, var(--storybook-annotations-warning, #e69d00) 28%, transparent)`,
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
            data-annotation-pin="true"
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
              border: `2px solid ${LIGHT_TEXT_COLOR}`,
              background: resolved ? RESOLVED_COLOR : OPEN_COLOR,
              color: LIGHT_TEXT_COLOR,
              fontSize: 11,
              lineHeight: '20px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: revealed
                ? `0 0 0 6px color-mix(in srgb, var(--storybook-annotations-primary, #ff4785) 35%, transparent)`
                : `0 1px 3px color-mix(in srgb, var(--storybook-annotations-default-text, #1f1f1f) 40%, transparent)`,
            }}
          >
            {number}
          </button>
        );
      })}
    </div>
  );
}
