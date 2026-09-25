#!/usr/bin/env node
/**
 * Post-install defaults for @kylebrodeur/storybook-addon-annotations.
 *
 * Registers the addon in the consumer's Storybook config so it is ready the
 * next time `storybook dev` starts. Everything here is additive and
 * idempotent; nothing consumer-owned is rewritten. Two things are
 * deliberately NOT done here: the review store is never gitignored (whether
 * annotations are tracked review content or local scratch is the team's
 * call — the install-time wizard asks), and the docs report page is
 * story-specific, offered by the Annotations panel while you view a story,
 * where Storybook indexes it without a restart.
 *
 * This script must stay plain CommonJS with no build step and no dependencies:
 * it runs before `dist/` may exist (git installs, cache restores) and must
 * never fail the install. All failures are swallowed into a one-line notice.
 */
const fs = require('node:fs');
const path = require('node:path');

const ADDON_PACKAGE = '@kylebrodeur/storybook-addon-annotations';
const SKIP_ENV = ['STORYBOOK_ANNOTATIONS_SKIP_SETUP', 'CI', 'npm_config_ignore_scripts'];
const STORYBOOK_CONFIGS = ['.storybook/main.ts', '.storybook/main.tsx', '.storybook/main.js', '.storybook/main.mjs'];

function note(message) {
  process.stdout.write(`${ADDON_PACKAGE}: ${message}\n`);
}

/** The package's own repo: never self-modify a checkout that uses local-preset. */
function isSelfInstall(projectRoot) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    return manifest.name === ADDON_PACKAGE;
  } catch {
    return false;
  }
}

/**
 * npm/pnpm/yarn run a dependency's postinstall with `process.cwd()` inside
 * `node_modules`, so the consumer root must come from `INIT_CWD`, the directory
 * the install was invoked from.
 */
function resolveProjectRoot() {
  const initCwd = process.env.INIT_CWD;
  if (initCwd && fs.existsSync(path.join(initCwd, 'package.json'))) return initCwd;
  // Fallback for environments that do not set INIT_CWD: walk up from the package
  // directory to the nearest package.json that is not the addon's own manifest.
  let dir = path.resolve(__dirname, '..');
  while (true) {
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest)) {
      try {
        if (JSON.parse(fs.readFileSync(manifest, 'utf8')).name !== ADDON_PACKAGE) return dir;
      } catch {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function findStorybookConfig(projectRoot) {
  for (const candidate of STORYBOOK_CONFIGS) {
    const absolutePath = path.join(projectRoot, candidate);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  return null;
}

function registerAddon(configPath) {
  const source = fs.readFileSync(configPath, 'utf8');
  if (source.includes(ADDON_PACKAGE)) return false;
  const addonsMatch = /addons\s*:\s*\[/.exec(source);
  if (addonsMatch === null) throw new Error('no `addons` array found in the Storybook config');
  const afterBracket = addonsMatch.index + addonsMatch[0].length;
  const lineStart = source.lastIndexOf('\n', afterBracket) + 1;
  const indentMatch = /^[ \t]*/.exec(source.slice(lineStart, afterBracket));
  const indent = indentMatch === null ? '  ' : indentMatch[0] || '  ';
  const restOfLine = source.slice(afterBracket, source.indexOf('\n', afterBracket));
  const entryIndentMatch = /^[ \t]+/.exec(restOfLine);
  const entryIndent = entryIndentMatch === null ? `${indent}  ` : entryIndentMatch[0];
  // A single-line array carries its entries and closing bracket on the rest of
  // the line; split both onto their own lines so the inserted entry formats
  // like the file was written that way.
  const closerMatch = /(\s*\][^\n]*)$/.exec(restOfLine);
  const closer = closerMatch === null ? '' : closerMatch[1];
  const head = closer === '' ? restOfLine : restOfLine.slice(0, closerMatch.index);
  const headPart = head.trim().length === 0 ? '' : `\n${entryIndent}${head.trim().replace(/,$/, '')},`;
  const closerPart = closer === '' ? '' : `\n${indent}${closer.trim()}`;
  fs.writeFileSync(
    configPath,
    `${source.slice(0, afterBracket)}\n${entryIndent}'${ADDON_PACKAGE}',${headPart}${closerPart}${source.slice(afterBracket + restOfLine.length)}`,
    'utf8',
  );
  return true;
}

function run() {
  if (SKIP_ENV.some((name) => process.env[name] === '1' || process.env[name] === 'true')) {
    note('skipped automatic setup (requested via environment).');
    return;
  }
  const projectRoot = resolveProjectRoot();
  if (projectRoot === null) {
    note('skipped automatic setup (no project root found).');
    return;
  }
  if (isSelfInstall(projectRoot)) {
    note('skipped automatic setup inside the addon repository.');
    return;
  }
  const configPath = findStorybookConfig(projectRoot);
  if (configPath === null) {
    note(`no .storybook/main.* found in ${projectRoot}; add "${ADDON_PACKAGE}" to the addons array manually.`);
    return;
  }
  const addonAdded = registerAddon(configPath);
  note(addonAdded ? 'registered in Storybook config. Restart Storybook if it is running.' : 'already registered.');
}

try {
  run();
} catch (error) {
  note(`skipped automatic setup (${error instanceof Error ? error.message : String(error)}).`);
}
