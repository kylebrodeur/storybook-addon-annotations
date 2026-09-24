import { DATA_ANCHOR_ATTR, STORY_ROOT_KEY } from './constants.ts';

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FractionPoint {
  xFraction: number;
  yFraction: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

/** Structural node shape used for anchor walking — lets tests pass a fake tree with no DOM. */
export interface AnchorNode {
  getAttribute(name: string): string | null;
  parentElement: AnchorNode | null;
}

/**
 * Resolve the DOM element a thread is anchored to. `STORY_ROOT_KEY` is the whole
 * canvas; otherwise match the opted-in `data-annotation-anchor` element. `null`
 * means the anchor is orphaned (element no longer in the DOM).
 */
export function resolveAnchorElement(canvasElement: Element, elementKey: string): Element | null {
  if (elementKey === STORY_ROOT_KEY) return canvasElement;
  return canvasElement.querySelector(`[${DATA_ANCHOR_ATTR}="${CSS.escape(elementKey)}"]`);
}

/** Walk up from a click target to the nearest anchored ancestor; fall back to the story root. */
export function anchorKeyFromClickTarget(target: AnchorNode | null, canvasElement: AnchorNode): string {
  let node: AnchorNode | null = target;
  while (node && node !== canvasElement) {
    const key = node.getAttribute(DATA_ANCHOR_ATTR);
    if (key !== null) return key;
    node = node.parentElement;
  }
  return STORY_ROOT_KEY;
}

/** Normalize a client point to `[0,1]` fractions of the rect, clamped to the rect. */
export function pointInRect(clientX: number, clientY: number, rect: RectLike): FractionPoint {
  const rawX = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
  const rawY = rect.height === 0 ? 0 : (clientY - rect.top) / rect.height;
  return {
    xFraction: Math.min(1, Math.max(0, rawX)),
    yFraction: Math.min(1, Math.max(0, rawY)),
  };
}

/** Inverse of `pointInRect`: recover the client pixel point for an in-bounds fraction. */
export function pinPixelInRect(rect: RectLike, point: FractionPoint): PixelPoint {
  return {
    x: rect.left + point.xFraction * rect.width,
    y: rect.top + point.yFraction * rect.height,
  };
}
