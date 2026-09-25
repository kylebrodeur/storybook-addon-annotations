import assert from 'node:assert/strict';
import test from 'node:test';

import { bulkStatusForSelection, nextSelection, selectionAction } from './bulkSelection.ts';

test('selection action resolves a selection containing open threads', () => {
  assert.equal(selectionAction(['open', 'open']), 'resolved');
  assert.equal(selectionAction(['open', 'resolved']), 'resolved');
});

test('selection action reopens a selection containing only resolved threads', () => {
  assert.equal(selectionAction(['resolved', 'resolved']), 'open');
});

test('next selection toggles one thread and supports select all', () => {
  assert.deepEqual(nextSelection(new Set(), 'a'), new Set(['a']));
  assert.deepEqual(nextSelection(new Set(['a']), 'a'), new Set());
  assert.deepEqual(nextSelection(new Set(['a']), 'b', ['a', 'b']), new Set(['a', 'b']));
});

test('bulk status preserves threads that were not selected', () => {
  const threads = [
    { id: 'a', status: 'open' as const },
    { id: 'b', status: 'resolved' as const },
    { id: 'c', status: 'open' as const },
  ];
  assert.deepEqual(bulkStatusForSelection(threads, new Set(['a', 'b']), 'resolved'), [
    { id: 'a', status: 'resolved' },
    { id: 'b', status: 'resolved' },
    { id: 'c', status: 'open' },
  ]);
});
