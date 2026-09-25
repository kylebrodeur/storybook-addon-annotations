#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const command = args[0] ?? 'init';

function flag(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

async function findMainConfig(): Promise<string> {
  for (const candidate of ['.storybook/main.ts', '.storybook/main.tsx', '.storybook/main.js', '.storybook/main.mjs']) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue searching the standard Storybook config filenames.
    }
  }
  throw new Error('Could not find a Storybook main config under .storybook/.');
}

async function addAddon(mainPath: string): Promise<void> {
  const source = await fs.readFile(mainPath, 'utf8');
  if (source.includes('@kylebrodeur/storybook-addon-annotations')) return;
  const addonsMatch = source.match(/addons\s*:\s*\[/);
  if (addonsMatch?.index !== undefined) {
    const insertAt = addonsMatch.index + addonsMatch[0].length;
    await fs.writeFile(
      mainPath,
      `${source.slice(0, insertAt)}\n    '@kylebrodeur/storybook-addon-annotations',${source.slice(insertAt)}`,
      'utf8',
    );
    return;
  }
  const exportIndex = source.lastIndexOf('export default');
  if (exportIndex === -1) throw new Error(`Could not find an addons array in ${mainPath}.`);
  const next = `${source.slice(0, exportIndex)}const annotationsAddon = '@kylebrodeur/storybook-addon-annotations';\n\n${source.slice(exportIndex)}`;
  await fs.writeFile(mainPath, next, 'utf8');
}

async function addGitignore(): Promise<void> {
  const file = '.gitignore';
  let source = '';
  try {
    source = await fs.readFile(file, 'utf8');
  } catch {
    // Create the file when the project has no gitignore yet.
  }
  if (source.split(/\r?\n/).includes('.storybook-annotations.jsonl')) return;
  await fs.writeFile(
    file,
    `${source}${source.endsWith('\n') || source.length === 0 ? '' : '\n'}.storybook-annotations.jsonl\n`,
    'utf8',
  );
}

function docsSource(storyId: string, title: string): string {
  return `import { Meta } from '@storybook/addon-docs/blocks';\n\nimport { Annotations } from '@kylebrodeur/storybook-addon-annotations/blocks';\n\n<Meta title=${JSON.stringify(title)} />\n\n# Annotations\n\n<Annotations storyId=${JSON.stringify(storyId)} />\n`;
}

function exampleSource(): string {
  return `import type { Meta, StoryObj } from '@storybook/react';\n\nconst meta = {\n  title: 'Review/Annotations Example',\n  render: () => (\n    <article data-annotation-anchor="example-card" style={{ padding: 24, fontFamily: 'sans-serif' }}>\n      <h2 data-annotation-anchor="example-title">Annotate this card</h2>\n      <p>Select this text or click the card while Annotate is active.</p>\n    </article>\n  ),\n};\n\nexport default meta satisfies Meta;\n\nexport const Default: StoryObj<typeof meta> = {};\n`;
}

async function main(): Promise<void> {
  if (command === 'init') {
    const mainPath = await findMainConfig();
    await addAddon(mainPath);
    if (!hasFlag('--no-gitignore')) await addGitignore();
    console.log(`Configured ${mainPath}`);
    console.log('The Annotations panel and toolbar will be available on the next Storybook run.');
    return;
  }
  if (command === 'add-docs') {
    const storyId = flag('--story-id');
    if (!storyId) throw new Error('add-docs requires --story-id <story-id>.');
    const output = flag('--output') ?? 'src/storybook/annotations.mdx';
    const title = flag('--title') ?? 'Review/Annotations';
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, docsSource(storyId, title), 'utf8');
    console.log(`Wrote ${output}`);
    return;
  }
  if (command === 'add-example') {
    const output = flag('--output') ?? 'src/stories/AnnotationsExample.stories.tsx';
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, exampleSource(), 'utf8');
    console.log(`Wrote ${output}`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
