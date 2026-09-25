import assert from 'node:assert/strict';
import { test } from 'node:test';

import { storiesGlobCoversDocs } from './projectFiles.ts';

test('storiesGlobCoversDocs matches a bare stories key with an .mdx glob', () => {
  const source = `const config = { stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'] };`;
  assert.equal(storiesGlobCoversDocs(source), true);
});

test('storiesGlobCoversDocs matches a quoted stories key (JSON-style config)', () => {
  const source = `const config = { "stories": ["../src/**/*.mdx", "../src/**/*.stories.tsx"] };`;
  assert.equal(storiesGlobCoversDocs(source), true);
});

test('storiesGlobCoversDocs matches a multiline stories array', () => {
  const source = [
    'const config = {',
    '  "stories": [',
    '    "../src/**/*.mdx",',
    '    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"',
    '  ],',
    '  "addons": ["@storybook/addon-docs"]',
    '};',
  ].join('\n');
  assert.equal(storiesGlobCoversDocs(source), true);
});

test('storiesGlobCoversDocs is false when no stories glob indexes .mdx', () => {
  const source = `const config = { "stories": ["../src/**/*.stories.tsx"] };`;
  assert.equal(storiesGlobCoversDocs(source), false);
});
