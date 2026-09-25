import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createDocsSource } from '../docsTemplate.ts';
import { setupProject } from './projectSetup.ts';

const MAIN_CONFIG = `import { defineMain } from '@storybook/react-vite/node';

const config = defineMain({
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  framework: '@storybook/react-vite',
});

export default config;
`;

async function tempProject(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'annotations-setup-'));
  await fs.mkdir(path.join(dir, '.storybook'), { recursive: true });
  await fs.writeFile(path.join(dir, '.storybook/main.ts'), MAIN_CONFIG, 'utf8');
  return dir;
}

test('docs source targets one story and imports the published blocks entry', () => {
  const source = createDocsSource('demo--default', 'Review/Annotations');
  assert.match(source, /<Meta title="Review\/Annotations" \/>/);
  assert.match(source, /<Annotations storyId="demo--default" \/>/);
  assert.match(source, /from '@kylebrodeur\/storybook-addon-annotations\/blocks'/);
});

test('setup without a docs story writes no docs page', async () => {
  const dir = await tempProject();
  const result = await setupProject(dir, {});
  assert.equal(result.docsWritten, false);
  await assert.rejects(fs.access(path.join(dir, 'src/storybook/annotations.mdx')));
});

test('setup with a docs story writes the docs page and reports it as covered', async () => {
  const dir = await tempProject();
  const result = await setupProject(dir, { docsStoryId: 'demo--default' });
  assert.equal(result.docsWritten, true);
  assert.equal(result.docsPath, 'src/storybook/annotations.mdx');
  assert.equal(result.docsGlobCovered, true);
  const written = await fs.readFile(path.join(dir, 'src/storybook/annotations.mdx'), 'utf8');
  assert.match(written, /<Annotations storyId="demo--default" \/>/);
});

test('setup does not clobber an existing docs page', async () => {
  const dir = await tempProject();
  const target = path.join(dir, 'src/storybook/annotations.mdx');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, '# hand written\n', 'utf8');
  const result = await setupProject(dir, { docsStoryId: 'demo--default' });
  assert.equal(result.docsWritten, false);
  assert.equal(await fs.readFile(target, 'utf8'), '# hand written\n');
});

test('setup reports an uncovered stories glob instead of writing an orphan page', async () => {
  const dir = await tempProject();
  await fs.writeFile(path.join(dir, '.storybook/main.ts'), MAIN_CONFIG.replace("'../src/**/*.mdx', ", ''), 'utf8');
  const result = await setupProject(dir, { docsStoryId: 'demo--default' });
  assert.equal(result.docsGlobCovered, false);
  assert.equal(result.docsWritten, false);
});

test('setup skips the docs page when another page already uses that title', async () => {
  const dir = await tempProject();
  await fs.mkdir(path.join(dir, 'src/stories'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'src/stories/Existing.mdx'),
    'import { Meta } from \'@storybook/addon-docs/blocks\';\n\n<Meta title="Review/Annotations" />\n\n# Existing\n',
    'utf8',
  );
  const result = await setupProject(dir, { docsStoryId: 'demo--default' });
  assert.equal(result.docsWritten, false);
  assert.equal(result.docsTitleTaken, true);
  await assert.rejects(fs.access(path.join(dir, 'src/storybook/annotations.mdx')));
});

test('setup ignores unrelated titles when checking for collisions', async () => {
  const dir = await tempProject();
  await fs.mkdir(path.join(dir, 'src/stories'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'src/stories/Other.mdx'),
    'import { Meta } from \'@storybook/addon-docs/blocks\';\n\n<Meta title="Unrelated/Page" />\n',
    'utf8',
  );
  const result = await setupProject(dir, { docsStoryId: 'demo--default' });
  assert.equal(result.docsTitleTaken, false);
  assert.equal(result.docsWritten, true);
});

test('setup registers the addon once and is idempotent', async () => {
  const dir = await tempProject();
  const first = await setupProject(dir, {});
  assert.equal(first.addonAdded, true);

  const config = await fs.readFile(path.join(dir, '.storybook/main.ts'), 'utf8');
  assert.equal(config.match(/@kylebrodeur\/storybook-addon-annotations/g)?.length, 1);
  assert.ok(config.includes("'@storybook/addon-docs'"), 'existing addon entries survive');

  const second = await setupProject(dir, {});
  assert.equal(second.addonAdded, false);
});

test('setup never touches the store tracking by default', async () => {
  const dir = await tempProject();
  await setupProject(dir, {});
  await assert.rejects(fs.access(path.join(dir, '.gitignore')));
});

test('setup ignores the store when asked', async () => {
  const dir = await tempProject();
  const result = await setupProject(dir, { storeTracking: 'ignore' });
  assert.equal(result.storeTracking, 'ignore');
  const gitignore = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
  assert.ok(gitignore.includes('.storybook-annotations.jsonl'));
});

test('setup keeps the store tracked and unignores it when asked', async () => {
  const dir = await tempProject();
  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\n.storybook-annotations.jsonl\n', 'utf8');
  const result = await setupProject(dir, { storeTracking: 'track' });
  assert.equal(result.storeTracking, 'track');
  const gitignore = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
  assert.equal(gitignore.includes('.storybook-annotations.jsonl'), false);
  assert.ok(gitignore.includes('node_modules'), 'unrelated ignore entries survive');
});

test('setup surfaces the store file so the panel can show where annotations live', async () => {
  const dir = await tempProject();
  const result = await setupProject(dir, {});
  assert.equal(result.storeFile, '.storybook-annotations.jsonl');
});
