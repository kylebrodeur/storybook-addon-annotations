import { promises as fs } from 'node:fs';

import { createDocsSource } from '../docsTemplate.ts';
import { findMdxDeclaring, resolveStorybookConfig, storiesGlobCoversDocs } from './projectFiles.ts';

export const ADDON_PACKAGE = '@kylebrodeur/storybook-addon-annotations';
export const DOCS_OUTPUT = 'src/storybook/annotations.mdx';
export const DOCS_TITLE = 'Review/Annotations';
export const STORE_FILE = '.storybook-annotations.jsonl';

export type StoreTracking = 'track' | 'ignore';

export interface ProjectSetupOptions {
  /** When set, setup writes an optional Docs report page for this story. */
  docsStoryId?: string;
  docsTitle?: string;
  /** When set, setup applies that tracking choice for the local store. */
  storeTracking?: StoreTracking;
}

export interface ProjectSetupResult {
  configPath: string;
  addonAdded: boolean;
  docsWritten: boolean;
  docsPath?: string;
  /** False when the stories glob would not index the docs page. */
  docsGlobCovered: boolean;
  /** True when another docs page already claims the report's title. */
  docsTitleTaken: boolean;
  /** The applied tracking choice, present when setup changed or confirmed it. */
  storeTracking?: StoreTracking;
  /** Where local threads live, surfaced so teams can review the choice. */
  storeFile: string;
}

/**
 * Insert the addon into the existing `addons` array. Matching keeps the file's
 * own indentation and trailing layout intact, and the surrounding entries are
 * preserved, so this is safe to run against a hand-written config.
 */
async function registerAddon(cwd: string, configPath: string): Promise<boolean> {
  const absolutePath = `${cwd}/${configPath}`;
  const source = await fs.readFile(absolutePath, 'utf8');
  if (source.includes(ADDON_PACKAGE)) return false;
  const addonsMatch = /addons\s*:\s*\[/.exec(source);
  if (addonsMatch?.index === undefined) throw new Error('storybook-addons-array-not-found');
  const afterBracket = addonsMatch.index + addonsMatch[0].length;
  const lineStart = source.lastIndexOf('\n', afterBracket) + 1;
  const indentMatch = /^[ \t]*/.exec(source.slice(lineStart, afterBracket));
  const indent = indentMatch?.[0] ?? '  ';
  const restOfLine = source.slice(afterBracket, source.indexOf('\n', afterBracket));
  const entryIndent = /^[ \t]+/.exec(restOfLine)?.[0] ?? `${indent}  `;
  // A single-line array carries its entries and closing bracket on the rest of
  // the line; split both onto their own lines so the inserted entry formats
  // like the file was written that way.
  const closerMatch = /(\s*\][^\n]*)$/.exec(restOfLine);
  const closer = closerMatch?.[1] ?? '';
  const head = closer === '' ? restOfLine : restOfLine.slice(0, closerMatch?.index ?? 0);
  const headPart = head.trim().length === 0 ? '' : `\n${entryIndent}${head.trim().replace(/,$/, '')},`;
  const closerPart = closer === '' ? '' : `\n${indent}${closer.trim()}`;
  await fs.writeFile(
    absolutePath,
    `${source.slice(0, afterBracket)}\n${entryIndent}'${ADDON_PACKAGE}',${headPart}${closerPart}${source.slice(afterBracket + restOfLine.length)}`,
    'utf8',
  );
  return true;
}

/**
 * Apply the caller's tracking choice for the local review store. Whether
 * annotations are committed review content or machine-local scratch is a team
 * decision, so setup only touches .gitignore when explicitly told to.
 */
async function applyStoreTracking(cwd: string, tracking: StoreTracking): Promise<void> {
  const absolutePath = `${cwd}/.gitignore`;
  let source = '';
  try {
    source = await fs.readFile(absolutePath, 'utf8');
  } catch {
    // A project may not have a gitignore yet; only 'ignore' needs to create one.
  }
  const lines = source.split(/\r?\n/);
  if (tracking === 'ignore') {
    if (lines.includes(STORE_FILE)) return;
    const separator = source.length > 0 && !source.endsWith('\n') ? '\n' : '';
    await fs.writeFile(absolutePath, `${source}${separator}${STORE_FILE}\n`, 'utf8');
    return;
  }
  if (!lines.includes(STORE_FILE)) return;
  const next = lines.filter((line) => line !== STORE_FILE).join('\n');
  await fs.writeFile(absolutePath, `${next}\n`, 'utf8');
}

/**
 * Storybook fails the whole index when two docs pages share a title, so the
 * report must not be written if an existing page already claims it.
 */
async function docsTitleIsTaken(cwd: string, title: string): Promise<boolean> {
  const marker = `<Meta title=${JSON.stringify(title)}`;
  const roots = ['src', 'stories', '.storybook'];
  for (const root of roots) {
    if (await findMdxDeclaring(`${cwd}/${root}`, marker)) return true;
  }
  return false;
}

export async function setupProject(
  cwd = process.cwd(),
  options: ProjectSetupOptions = {},
): Promise<ProjectSetupResult> {
  const configPath = await resolveStorybookConfig(cwd);
  if (configPath === null) throw new Error('storybook-main-config-not-found');
  const configSource = await fs.readFile(`${cwd}/${configPath}`, 'utf8');
  const addonAdded = await registerAddon(cwd, configPath);
  if (options.storeTracking !== undefined) {
    await applyStoreTracking(cwd, options.storeTracking);
  }

  const docsTitle = options.docsTitle ?? DOCS_TITLE;
  const docsGlobCovered = storiesGlobCoversDocs(configSource);
  const docsTitleTaken = options.docsStoryId !== undefined && (await docsTitleIsTaken(cwd, docsTitle));
  let docsWritten = false;
  if (options.docsStoryId !== undefined && docsGlobCovered && !docsTitleTaken) {
    const absolutePath = `${cwd}/${DOCS_OUTPUT}`;
    try {
      await fs.access(absolutePath);
    } catch {
      await fs.mkdir(`${cwd}/src/storybook`, { recursive: true });
      await fs.writeFile(absolutePath, createDocsSource(docsTitle), 'utf8');
      docsWritten = true;
    }
  }

  const result: ProjectSetupResult = {
    configPath,
    addonAdded,
    docsWritten,
    docsGlobCovered,
    docsTitleTaken,
    storeFile: STORE_FILE,
  };
  if (options.storeTracking !== undefined) result.storeTracking = options.storeTracking;
  if (docsWritten) result.docsPath = DOCS_OUTPUT;
  return result;
}
