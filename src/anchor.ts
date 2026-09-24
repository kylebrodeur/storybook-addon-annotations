import { DATA_ANCHOR_ATTR, STORY_ROOT_KEY } from './constants.ts';
import type { AnnotationAnchor, FractionPoint, FractionRect, TextRangeAnnotationAnchor } from './types.ts';

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface AnchorNode {
  getAttribute(name: string): string | null;
  parentElement: AnchorNode | null;
}

export function resolveAnchorElement(canvasElement: Element, elementKey: string): Element | null {
  if (elementKey === STORY_ROOT_KEY) return canvasElement;
  return canvasElement.querySelector(`[${DATA_ANCHOR_ATTR}="${CSS.escape(elementKey)}"]`);
}

export function anchorKeyFromClickTarget(target: AnchorNode | null, canvasElement: AnchorNode): string {
  let node: AnchorNode | null = target;
  while (node && node !== canvasElement) {
    const key = node.getAttribute(DATA_ANCHOR_ATTR);
    if (key !== null) return key;
    node = node.parentElement;
  }
  return STORY_ROOT_KEY;
}

export function pointInRect(clientX: number, clientY: number, rect: RectLike): FractionPoint {
  const rawX = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
  const rawY = rect.height === 0 ? 0 : (clientY - rect.top) / rect.height;
  return {
    xFraction: Math.min(1, Math.max(0, rawX)),
    yFraction: Math.min(1, Math.max(0, rawY)),
  };
}

export function rectInRect(rect: RectLike, anchor: RectLike): FractionRect {
  const x = anchor.width === 0 ? 0 : (rect.left - anchor.left) / anchor.width;
  const y = anchor.height === 0 ? 0 : (rect.top - anchor.top) / anchor.height;
  const width = anchor.width === 0 ? 0 : rect.width / anchor.width;
  const height = anchor.height === 0 ? 0 : rect.height / anchor.height;
  return {
    xFraction: Math.min(1, Math.max(0, x)),
    yFraction: Math.min(1, Math.max(0, y)),
    widthFraction: Math.min(1, Math.max(0, width)),
    heightFraction: Math.min(1, Math.max(0, height)),
  };
}

export function pinPixelInRect(rect: RectLike, point: FractionPoint): PixelPoint {
  return {
    x: rect.left + point.xFraction * rect.width,
    y: rect.top + point.yFraction * rect.height,
  };
}

export function rectPixelInRect(rect: RectLike, fraction: FractionRect): RectLike {
  return {
    left: rect.left + fraction.xFraction * rect.width,
    top: rect.top + fraction.yFraction * rect.height,
    width: fraction.widthFraction * rect.width,
    height: fraction.heightFraction * rect.height,
  };
}

export function normalizeAnchor(anchor: AnnotationAnchor | LegacyAnchor): AnnotationAnchor {
  if ('kind' in anchor) return anchor;
  return { kind: 'point', ...anchor, rect: { xFraction: 0, yFraction: 0, widthFraction: 1, heightFraction: 1 } };
}

export interface LegacyAnchor {
  storyId: string;
  elementKey: string;
  point: FractionPoint;
}

export function textRangeAnchorFromSelection(
  selection: Selection,
  storyId: string,
  elementKey: string,
  anchorElement: Element,
): TextRangeAnnotationAnchor | null {
  if (selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!anchorElement.contains(range.commonAncestorContainer)) return null;
  const quote = selection.toString().trim();
  if (quote.length === 0) return null;
  const anchorRect = anchorElement.getBoundingClientRect();
  const rangeRects = [...range.getClientRects()].map((rect) => rectInRect(rect, anchorRect));
  const rangeRect = range.getBoundingClientRect();
  return {
    kind: 'text-range',
    storyId,
    elementKey,
    point: pointInRect(rangeRect.left + rangeRect.width / 2, rangeRect.top + rangeRect.height / 2, anchorRect),
    rect: rectInRect(rangeRect, anchorRect),
    quote,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    rangeRects,
  };
}
