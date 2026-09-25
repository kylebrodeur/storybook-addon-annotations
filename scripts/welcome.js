#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Interactive first-run wizard for @kylebrodeur/storybook-addon-annotations.
 *
 * This is the Storybook Addon Kit's onboarding pattern — a prompts-driven,
 * cancel-safe wizard gated off in CI — applied to this addon's setup. The
 * silent postinstall registers the addon; this wizard handles the decisions
 * that belong to a human: whether review threads are tracked in git or kept
 * local, and whether to generate the docs report page.
 *
 * It has zero dependencies on purpose: it ships in the published package,
 * where devDependencies like `prompts` do not exist. It reads answers over
 * stdin with the readline built-in.
 *
 * Runs automatically after install (chained after the silent registration in
 * postinstall.cjs) whenever a real terminal is present; CI and non-interactive
 * installs skip it and the Annotations panel in Storybook covers the same
 * decisions.
 */
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ADDON_PACKAGE = '@kylebrodeur/storybook-addon-annotations';
const STORE_FILE = '.storybook-annotations.jsonl';
const DOCS_OUTPUT = 'src/storybook/annotations.mdx';
const MAIN_CONFIGS = ['.storybook/main.ts', '.storybook/main.tsx', '.storybook/main.js', '.storybook/main.mjs'];

const bold = (message) => `\u001b[1m${message}\u001b[22m`;
const magenta = (message) => `\u001b[35m${message}\u001b[39m`;

async function findMainConfig() {
  for (const candidate of MAIN_CONFIGS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next standard Storybook config filename.
    }
  }
  throw new Error('Could not find a Storybook main config under .storybook/.');
}

async function registerAddon(mainPath) {
  const source = await fs.readFile(mainPath, 'utf8');
  if (source.includes(ADDON_PACKAGE)) return false;
  const addonsMatch = /addons\s*:\s*\[/.exec(source);
  if (addonsMatch?.index === undefined) throw new Error(`Could not find an addons array in ${mainPath}.`);
  const insertAt = addonsMatch.index + addonsMatch[0].length;
  await fs.writeFile(mainPath, `${source.slice(0, insertAt)}\n  '${ADDON_PACKAGE}',${source.slice(insertAt)}`, 'utf8');
  return true;
}

async function applyStoreTracking(projectRoot, track) {
  const gitignorePath = resolve(projectRoot, '.gitignore');
  let source = '';
  try {
    source = await fs.readFile(gitignorePath, 'utf8');
  } catch {
    // A project may not have a gitignore yet; only 'ignore' needs to create one.
  }
  const lines = source.split(/\r?\n/);
  if (track) {
    if (!lines.includes(STORE_FILE)) return false;
    const next = lines.filter((line) => line !== STORE_FILE).join('\n');
    await fs.writeFile(gitignorePath, `${next}\n`, 'utf8');
    return true;
  }
  if (lines.includes(STORE_FILE)) return false;
  const separator = source.length > 0 && !source.endsWith('\n') ? '\n' : '';
  await fs.writeFile(gitignorePath, `${source}${separator}${STORE_FILE}\n`, 'utf8');
  return true;
}

function docsReportSource(storyId) {
  return [
    "import { Meta } from '@storybook/addon-docs/blocks';",
    '',
    `import { Annotations } from '${ADDON_PACKAGE}/blocks';`,
    '',
    '<Meta title="Review/Annotations" />',
    '',
    '# Annotations',
    '',
    `<Annotations storyId="${storyId}" />`,
    '',
  ].join('\n');
}

async function writeDocsReport(storyId) {
  await fs.mkdir(dirname(DOCS_OUTPUT), { recursive: true });
  await fs.writeFile(DOCS_OUTPUT, docsReportSource(storyId), 'utf8');
  return DOCS_OUTPUT;
}

/** Ask one question, return the trimmed answer or the fallback on empty input. */
async function ask(rl, question, fallback) {
  return new Promise((resolveAnswer) => {
    rl.question(question, (answer) => resolveAnswer(answer.trim() || fallback));
  });
}

async function askStoreTracking(rl) {
  const raw = await ask(rl, 'Track annotations in git as review content? [Y]es / [n]o / [c]ancel: ', 'y');
  if (raw.startsWith('c')) return null;
  return raw.startsWith('n') ? 'ignore' : 'track';
}

async function main() {
  if (!process.stdin.isTTY || process.env.CI) {
    console.log(
      `${ADDON_PACKAGE}: interactive setup needs a terminal; use the Annotations panel in Storybook to choose store tracking and generate the Docs report.`,
    );
    process.exit(0);
  }
  console.log(
    bold(
      magenta(`
        Annotations — first-run setup
        A few questions to finish setting up visual review:
      `),
    ),
  );

  const mainPath = await findMainConfig();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const confirmed = (await ask(rl, `Register ${ADDON_PACKAGE} in ${mainPath}? [Y]es / [n]o: `, 'y'))
    .toLowerCase()
    .startsWith('y');
  if (!confirmed) {
    rl.close();
    console.log('\nSetup canceled. Reinstall the package or use the Annotations panel whenever you are ready.');
    return;
  }

  const storeTracking = await askStoreTracking(rl);
  if (storeTracking === null) {
    rl.close();
    console.log('\nSetup canceled. Nothing was written.');
    return;
  }

  const wantsDocs = (await ask(rl, 'Create the annotations page (Review/Annotations)? [y]es / [N]o: ', 'n'))
    .toLowerCase()
    .startsWith('y');
  let storyId;
  if (wantsDocs) {
    storyId = await ask(rl, 'Story ID to report on (e.g. example-button--primary): ', '');
  }

  const docsAnswer = (wantsDocs && storyId) || null;
  rl.close();

  const added = await registerAddon(mainPath);
  console.log(added ? `Registered in ${mainPath}.` : `Already registered in ${mainPath}.`);
  console.log('Restart Storybook to load the addon.');

  const changed = await applyStoreTracking(process.cwd(), storeTracking === 'track');
  if (storeTracking === 'track') {
    console.log(
      changed
        ? `Removed ${STORE_FILE} from .gitignore — annotations will be committed as review content.`
        : `${STORE_FILE} is already tracked in git.`,
    );
  } else {
    console.log(
      changed
        ? `Added ${STORE_FILE} to .gitignore.`
        : `${STORE_FILE} is already ignored — annotations stay local to this machine.`,
    );
  }

  if (docsAnswer !== null) {
    const output = await writeDocsReport(docsAnswer);
    console.log(`Wrote ${output} for story ${docsAnswer}. Storybook indexes it without a restart.`);
  }

  console.log(
    `\n${bold('Annotations is set up.')} Open the Annotations panel in Storybook to leave threaded review comments.`,
  );
}

main().catch((e) => console.log(`Something went wrong: ${e}`));
