#!/usr/bin/env node
// Reply to an annotation thread on a running Storybook dev server.
// Usage: node reply.mjs --id <thread-id> --body "message" [--port <n>] [--author agent|human] [--name "Agent"]
//
// Server discovery: --port flag, STORYBOOK_PORT env, then common ports.
// See server-discovery.mjs for the full resolution order.

import { buildBaseUrl, discoverServerPort } from './server-discovery.mjs';

const args = process.argv.slice(2);
const explicitPort = getArg('--port');
const id = getArg('--id');
const body = getArg('--body');
const author = getArg('--author') ?? 'agent';
const name = getArg('--name') ?? 'Agent';

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

if (!id || !body) {
  console.error(
    'Usage: node reply.mjs --id <thread-id> --body "message" [--port <n>] [--author agent] [--name "Agent"]',
  );
  process.exit(1);
}

try {
  const port = await discoverServerPort(explicitPort);
  const base = buildBaseUrl(port);

  const res = await fetch(`${base}/storybook-annotations/threads/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id,
      message: { author, authorName: name, body },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`Error: ${err.error ?? res.status}`);
    process.exit(1);
  }
  const thread = await res.json();
  console.log(`Replied to thread ${thread.id} as ${name} (${author}) on port ${port}`);
  console.log(`Status: ${thread.status}, messages: ${thread.messages.length}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
