import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('preview does not treat the channel emitter as an event channel', async () => {
  const source = await readFile(new URL('./preview.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('channel.on'), false);
  assert.equal(source.includes('useChannel({'), true);
});
