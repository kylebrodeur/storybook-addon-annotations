#!/usr/bin/env node
// Publish gate for @kylebrodeur/storybook-addon-annotations, wired to
// prepublishOnly so it guards every `npm publish`. Plain Node on purpose.
// Checks: kit-default metadata, kit-template README, and peer deps that
// duplicate packages Storybook already provides at runtime.

import { readFile } from 'node:fs/promises';

const KIT_NAME_MARKERS = ['addon-kit'];
const KIT_DISPLAY_NAME = 'Addon Kit';
const KIT_README_MARKERS = [
  '# Storybook Addon Kit',
  'Click the **Use this template** button to get started.',
  'https://user-images.githubusercontent.com/42671/106809879-35b32000-663a-11eb-9cdc-89f178b5273f.gif',
];
const STORYBOOK_PROVIDED = [
  'storybook',
  '@storybook/components',
  '@storybook/channel-postmessage',
  '@storybook/channels',
  '@storybook/core-events',
  '@storybook/router',
  '@storybook/theming',
  '@storybook/api',
  '@storybook/manager-api',
  '@storybook/client-logger',
  '@storybook/global',
  'react',
  'react-dom',
];

let exitCode = 0;
const fail = (title, detail) => {
  console.error(`FAIL: ${title}: ${detail}`);
  exitCode = 1;
};

const packageJson = JSON.parse(await readFile('./package.json', 'utf8'));

if (KIT_NAME_MARKERS.some((marker) => packageJson.name.includes(marker))) {
  fail('Missing metadata', 'package.json name still includes Addon Kit defaults');
}
if (packageJson.storybook?.displayName === KIT_DISPLAY_NAME) {
  fail('Missing metadata', 'storybook.displayName is still the Addon Kit default');
}

const readme = await readFile('./README.md', 'utf8');
if (KIT_README_MARKERS.some((marker) => readme.includes(marker))) {
  fail('README not updated', 'README.md still contains Addon Kit template content');
}

for (const dependency of Object.keys(packageJson.peerDependencies ?? {})) {
  if (STORYBOOK_PROVIDED.includes(dependency)) {
    fail('Unnecessary peer dependency', `"${dependency}" is provided by Storybook at runtime`);
  }
}

if (exitCode === 0) console.log('prepublish checks passed');
process.exit(exitCode);
