import { promises as fs } from 'node:fs';

const STORYBOOK_CONFIGS = [
  '.storybook/main.ts',
  '.storybook/main.tsx',
  '.storybook/main.js',
  '.storybook/main.mjs',
  '.storybook/main.cjs',
];

/**
 * Resolve the Storybook config for a project directory.
 *
 * Shared by setup and postinstall so both agree on which file is authoritative.
 * Returns `null` rather than throwing: callers decide whether a missing config is
 * fatal (interactive setup) or expected (a dependency resolving before the
 * consumer has a Storybook).
 *
 * `cwd` must be the consumer project root. Under npm/pnpm/yarn the package's own
 * `process.cwd()` is its directory inside `node_modules`, so callers pass
 * `INIT_CWD` instead.
 */
export async function resolveStorybookConfig(cwd: string): Promise<string | null> {
  for (const candidate of STORYBOOK_CONFIGS) {
    try {
      await fs.access(`${cwd}/${candidate}`);
      return candidate;
    } catch {
      // Try the next standard Storybook config filename.
    }
  }
  return null;
}

const SKIP_DIRS = {
  node_modules: true,
  '.git': true,
  dist: true,
  build: true,
  coverage: true,
  '.next': true,
  '.turbo': true,
} satisfies Record<string, true>;

/**
 * Whether any `.mdx` file under `dir` declares `marker`, e.g. a `<Meta title=...>`.
 *
 * Storybook fails the entire index when two docs pages share a title, so callers
 * use this to avoid creating that conflict.
 */
export async function findMdxDeclaring(dir: string, marker: string): Promise<boolean> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (Object.hasOwn(SKIP_DIRS, entry.name)) continue;
      if (await findMdxDeclaring(`${dir}/${entry.name}`, marker)) return true;
    } else if (entry.name.endsWith('.mdx')) {
      const source = await fs.readFile(`${dir}/${entry.name}`, 'utf8');
      if (source.includes(marker)) return true;
    }
  }
  return false;
}

/**
 * Whether a `stories` glob in a Storybook config would index `src/storybook/annotations.mdx`.
 * Writing the file anyway would leave a page on disk that Storybook never shows.
 */
export function storiesGlobCoversDocs(source: string): boolean {
  const storiesMatch = /["']?stories["']?\s*:\s*\[([\s\S]*?)\]/.exec(source);
  if (storiesMatch?.[1] === undefined) return false;
  return storiesMatch[1].includes('.mdx');
}
