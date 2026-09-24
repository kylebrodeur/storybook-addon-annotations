import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STORY_ROOT_KEY } from '../constants.ts';
import type { AnnotationThread } from '../types.ts';
import { toJsonl, toMarkdown } from './render.ts';

function thread(id: string, storyTitle: string, status: 'open' | 'resolved', bodies: string[]): AnnotationThread {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id,
    anchor: {
      kind: 'point',
      storyId: 'demo--default',
      elementKey: STORY_ROOT_KEY,
      point: { xFraction: 0.5, yFraction: 0.5 },
      rect: { xFraction: 0, yFraction: 0, widthFraction: 1, heightFraction: 1 },
    },
    storyTitle,
    status,
    messages: bodies.map((body, index) => ({
      id: `${id}-${index}`,
      author: 'human',
      authorName: 'You',
      body,
      createdAt: now,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

test('toJsonl yields one parseable JSON object per input thread', () => {
  const lines = toJsonl([thread('a', 'Demo', 'open', ['x']), thread('b', 'Demo', 'resolved', ['y'])]).split('\n');
  assert.equal(lines.length, 2);
  for (const line of lines) assert.doesNotThrow(() => JSON.parse(line));
});

test('toMarkdown groups by story, marks status, one bullet per message, no HTML tags', () => {
  const markdown = toMarkdown([thread('a', 'Demo', 'open', ['first', 'second'])]);
  assert.match(markdown, /^# Annotations/);
  assert.match(markdown, /## Demo/);
  assert.match(markdown, /\[open\]/);
  assert.equal((markdown.match(/^- /gm) ?? []).length, 2);
  assert.ok(!markdown.includes('<') && !markdown.includes('>'));
});
