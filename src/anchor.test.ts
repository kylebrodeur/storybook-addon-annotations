import assert from 'node:assert/strict';
import { test } from 'node:test';

import { anchorKeyFromClickTarget, pinPixelInRect, pointInRect, type AnchorNode } from './anchor.ts';
import { DATA_ANCHOR_ATTR, STORY_ROOT_KEY } from './constants.ts';

const rect = { left: 100, top: 50, width: 200, height: 100 };

test('pointInRect clamps out-of-rect points to [0,1]', () => {
  assert.deepEqual(pointInRect(0, 0, rect), { xFraction: 0, yFraction: 0 });
  assert.deepEqual(pointInRect(1000, 1000, rect), { xFraction: 1, yFraction: 1 });
  assert.deepEqual(pointInRect(200, 100, rect), { xFraction: 0.5, yFraction: 0.5 });
});

test('pinPixelInRect inverts pointInRect for in-bounds points', () => {
  const fraction = pointInRect(180, 90, rect);
  const pixel = pinPixelInRect(rect, fraction);
  assert.ok(Math.abs(pixel.x - 180) < 1e-9);
  assert.ok(Math.abs(pixel.y - 90) < 1e-9);
});

function fakeNode(anchorValue: string | null, parentElement: AnchorNode | null): AnchorNode {
  return {
    getAttribute: (name) => (name === DATA_ANCHOR_ATTR ? anchorValue : null),
    parentElement,
  };
}

test('anchorKeyFromClickTarget returns nearest ancestor anchor, else story root', () => {
  const canvas = fakeNode(null, null);
  const anchored = fakeNode('hero-title', canvas);
  const clickTarget = fakeNode(null, anchored);
  assert.equal(anchorKeyFromClickTarget(clickTarget, canvas), 'hero-title');

  const untagged = fakeNode(null, canvas);
  assert.equal(anchorKeyFromClickTarget(untagged, canvas), STORY_ROOT_KEY);
});
