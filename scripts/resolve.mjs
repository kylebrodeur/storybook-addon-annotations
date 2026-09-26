#!/usr/bin/env node
// Resolve or reopen an annotation thread on a running Storybook dev server.
// Usage: node resolve.mjs --id <thread-id> [--port <n>] [--reopen]
//
// Server discovery: --port flag, STORYBOOK_PORT env, then common ports.
// See server-discovery.mjs for the full resolution order.

import { buildBaseUrl, discoverServerPort } from './server-discovery.mjs';

const args = process.argv.slice(2);
const explicitPort = getArg('--port');
const id = getArg('--id');
const reopen = args.includes('--reopen');
const status = reopen ? 'open' : 'resolved';

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

if (!id) {
  console.error('Usage: node resolve.mjs --id <thread-id> [--port <n>] [--reopen]');
  process.exit(1);
}

try {
  const port = await discoverServerPort(explicitPort);
  const base = buildBaseUrl(port);

  const res = await fetch(`${base}/storybook-annotations/threads/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Error: ${err.error ?? res.status}`);
    process.exit(1);
  }
  const thread = await res.json();
  console.log(`Thread ${thread.id} is now ${thread.status} (port ${port})`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
