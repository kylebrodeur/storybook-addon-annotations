import assert from 'node:assert/strict';
import test from 'node:test';

import { enableAnnotationMode } from './annotateMode.ts';
import { GLOBAL_KEY } from './constants.ts';

test('enabling annotation mode sets the annotate global to on', () => {
  const calls: Array<Record<string, string | boolean>> = [];
  enableAnnotationMode({ updateGlobals: (globals) => calls.push(globals) });
  assert.deepEqual(calls, [{ [GLOBAL_KEY]: 'on' }]);
});

test('the real manager API object satisfies the narrow globals contract', () => {
  const calls: Array<Record<string, string | boolean>> = [];
  // A stand-in for Storybook's full API: many members, only updateGlobals is used.
  const managerApi = {
    updateGlobals: (globals: Record<string, string | boolean>) => calls.push(globals),
    getGlobals: () => ({}),
    setSelectedPanel: () => undefined,
  };
  enableAnnotationMode(managerApi);
  assert.deepEqual(calls, [{ [GLOBAL_KEY]: 'on' }]);
});
