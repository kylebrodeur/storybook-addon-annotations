import { promises as fs } from 'node:fs';
import path from 'node:path';

import { DEFAULT_STORE_FILE } from '../src/constants.ts';
import { toJsonl, toMarkdown } from '../src/export/render.ts';
import { createJsonlStore } from '../src/store/jsonlStore.ts';

const args = process.argv.slice(2);
const fileFlagIndex = args.indexOf('--file');
const fileArg = fileFlagIndex === -1 ? undefined : args[fileFlagIndex + 1];
const storeFile = fileArg ?? process.env.SB_ANNOTATIONS_FILE ?? path.join(process.cwd(), DEFAULT_STORE_FILE);

const threads = await createJsonlStore(storeFile).list();
const jsonlPath = path.join(process.cwd(), 'annotations.jsonl');
const mdxPath = path.join(process.cwd(), 'annotations.mdx');

await fs.writeFile(jsonlPath, threads.length ? `${toJsonl(threads)}\n` : '', 'utf8');
await fs.writeFile(mdxPath, toMarkdown(threads), 'utf8');

console.log(`wrote ${jsonlPath}`);
console.log(`wrote ${mdxPath}`);
