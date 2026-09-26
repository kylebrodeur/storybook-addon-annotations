#!/usr/bin/env node
// List annotation threads from a running Storybook dev server.
// Usage: node threads.mjs [--port <n>] [--story <storyId>] [--status open|resolved]
//
// Server discovery: --port flag, STORYBOOK_PORT env, then common ports.
// See server-discovery.mjs for the full resolution order.

import { buildBaseUrl, discoverServerPort } from './server-discovery.mjs';

const args = process.argv.slice(2);
const explicitPort = getArg('--port');
const story = getArg('--story');
const status = getArg('--status');

function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

try {
  const port = await discoverServerPort(explicitPort);
  const base = buildBaseUrl(port);

  const params = new URLSearchParams();
  if (story) params.set('storyId', story);
  const query = params.toString() ? `?${params}` : '';

  const res = await fetch(`${base}/storybook-annotations/threads${query}`);
  if (!res.ok) {
    console.error(`Error: server on port ${port} returned ${res.status}.`);
    process.exit(1);
  }
  let threads = await res.json();
  if (status) threads = threads.filter((t) => t.status === status);
  const output = threads.map((t) => ({
    id: t.id,
    storyId: t.anchor?.storyId,
    storyTitle: t.storyTitle,
    status: t.status,
    elementKey: t.anchor?.elementKey,
    firstMessage: t.messages?.[0]?.body?.slice(0, 120),
    messageCount: t.messages?.length,
  }));
  console.log(JSON.stringify(output, null, 2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
