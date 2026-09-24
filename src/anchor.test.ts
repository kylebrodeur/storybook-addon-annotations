import assert from 'node:assert/strict';
import test from 'node:test';

import { anchorKeyFromClickTarget, pinPixelInRect, pointInRect, rectInRect, rectPixelInRect } from './anchor.ts';

test('pointInRect clamps out-of-rect points to [0,1]', () => {
  assert.deepEqual(pointInRect(0, 250, { left: 100, top: 100, width: 100, height: 100 }), {
    xFraction: 0,
    yFraction: 1,
  });
});

test('pinPixelInRect inverts pointInRect for in-bounds points', () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 };
  const point = pointInRect(110, 70, rect);
  assert.deepEqual(pinPixelInRect(rect, point), { x: 110, y: 70 });
});

test('rectInRect and rectPixelInRect preserve selected bounds', () => {
  const anchor = { left: 100, top: 50, width: 400, height: 200 };
  const selected = { left: 200, top: 100, width: 120, height: 40 };
  const fraction = rectInRect(selected, anchor);
  assert.deepEqual(fraction, { xFraction: 0.25, yFraction: 0.25, widthFraction: 0.3, heightFraction: 0.2 });
  assert.deepEqual(rectPixelInRect(anchor, fraction), selected);
});

test('anchorKeyFromClickTarget returns nearest ancestor anchor, else story root', () => {
  const parent = {
    getAttribute: (name: string) => (name === 'data-annotation-anchor' ? 'card' : null),
    parentElement: null,
  };
  const child = { getAttribute: () => null, parentElement: parent };
  const canvas = { getAttribute: () => null, parentElement: null };
  assert.equal(anchorKeyFromClickTarget(child, canvas), 'card');
  assert.equal(anchorKeyFromClickTarget(canvas, canvas), '__story_root__');
});
