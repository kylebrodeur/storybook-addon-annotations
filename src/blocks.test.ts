import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveDocsSelection } from './docsSelection.ts';

test('no selector loads every stored thread', () => {
  assert.deepEqual(resolveDocsSelection(undefined, undefined), { kind: 'all' });
});

test('a story selector loads only that story', () => {
  assert.deepEqual(resolveDocsSelection('demo--default', undefined), { kind: 'story', storyId: 'demo--default' });
});

test('a title selector filters the full store to that title', () => {
  assert.deepEqual(resolveDocsSelection(undefined, 'Demo'), { kind: 'title', title: 'Demo' });
});

test('supplying both selectors is an error', () => {
  assert.deepEqual(resolveDocsSelection('demo--default', 'Demo'), {
    kind: 'error',
    message: 'Provide exactly one of storyId or title.',
  });
});
