import { promises as fs } from 'node:fs';

const ADDON_PACKAGE = '@kylebrodeur/storybook-addon-annotations';
const MAIN_CONFIGS = ['.storybook/main.ts', '.storybook/main.tsx', '.storybook/main.js', '.storybook/main.mjs'];

export interface ProjectSetupResult {
  configPath: string;
  addonAdded: boolean;
  gitignoreUpdated: boolean;
}

async function findMainConfig(cwd: string): Promise<string> {
  for (const candidate of MAIN_CONFIGS) {
    try {
      await fs.access(`${cwd}/${candidate}`);
      return candidate;
    } catch {
      // Try the next standard Storybook config filename.
    }
  }
  throw new Error('storybook-main-config-not-found');
}

async function registerAddon(cwd: string, configPath: string): Promise<boolean> {
  const absolutePath = `${cwd}/${configPath}`;
  const source = await fs.readFile(absolutePath, 'utf8');
  if (source.includes(ADDON_PACKAGE)) return false;
  const addonsMatch = source.match(/addons\s*:\s*\[/);
  if (addonsMatch?.index === undefined) throw new Error('storybook-addons-array-not-found');
  const insertAt = addonsMatch.index + addonsMatch[0].length;
  await fs.writeFile(
    absolutePath,
    `${source.slice(0, insertAt)}\n    '${ADDON_PACKAGE}',${source.slice(insertAt)}`,
    'utf8',
  );
  return true;
}

async function updateGitignore(cwd: string): Promise<boolean> {
  const absolutePath = `${cwd}/.gitignore`;
  let source = '';
  try {
    source = await fs.readFile(absolutePath, 'utf8');
  } catch {
    // A project may not have a gitignore yet.
  }
  if (source.split(/\r?\n/).includes('.storybook-annotations.jsonl')) return false;
  await fs.writeFile(
    absolutePath,
    `${source}${source.length > 0 && !source.endsWith('\n') ? '\n' : ''}.storybook-annotations.jsonl\n`,
    'utf8',
  );
  return true;
}

export async function setupProject(cwd = process.cwd()): Promise<ProjectSetupResult> {
  const configPath = await findMainConfig(cwd);
  const addonAdded = await registerAddon(cwd, configPath);
  const gitignoreUpdated = await updateGitignore(cwd);
  return { configPath, addonAdded, gitignoreUpdated };
}
