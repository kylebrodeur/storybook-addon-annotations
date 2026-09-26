#!/usr/bin/env node
/**
 * Storybook Annotations CLI — single entry point, JSON in, JSON out.
 *
 * Usage:
 *   echo '{"command": "threads", "status": "open"}' | node cli/cli.mjs
 *   echo '{"command": "reply", "id": "...", "body": "Fixed", "name": "Claude"}' | node cli/cli.mjs
 *   echo '{"command": "resolve", "id": "..."}' | node cli/cli.mjs
 *
 * All commands accept an optional "port" field for explicit server override.
 * Without it, the CLI discovers the Storybook dev server via STORYBOOK_PORT
 * env or probing common ports (6006, 6007, 6106, 6107).
 *
 * Input: JSON on stdin (or as the first CLI argument for simple cases).
 * Output: JSON on stdout on success. Errors go to stderr as JSON with exit 1.
 *
 * Commands:
 *   threads  — List threads. Optional: "story" (storyId filter), "status" ("open"|"resolved")
 *   reply    — Reply to a thread. Required: "id", "body". Optional: "author" ("agent"|"human", default "agent"), "name" (display name, default "Agent")
 *   resolve  — Resolve a thread. Required: "id". Optional: "reopen" (boolean, reopens instead)
 */

import { buildBaseUrl, discoverServerPort } from './server-discovery.mjs';

function usage() {
  return {
    commands: {
      threads: {
        description: 'List annotation threads',
        optional: {
          story: 'Filter by storyId',
          status: 'Filter by "open" or "resolved"',
          port: 'Explicit server port override',
        },
      },
      reply: {
        description: 'Reply to a thread',
        required: { id: 'Thread ID', body: 'Reply message body' },
        optional: {
          author: 'agent or human (default: agent)',
          name: 'Display name for the reply (default: Agent)',
          port: 'Explicit server port override',
        },
      },
      resolve: {
        description: 'Resolve a thread',
        required: { id: 'Thread ID' },
        optional: {
          reopen: 'Set true to reopen instead of resolve',
          port: 'Explicit server port override',
        },
      },
    },
    input: 'JSON on stdin, or as the first CLI argument',
    output: 'JSON on stdout; errors as JSON on stderr with exit 1',
  };
}

function errorExit(message, code = 'error') {
  process.stderr.write(JSON.stringify({ ok: false, error: message, code }) + '\n');
  process.exit(1);
}

async function readInput() {
  // If a JSON argument is passed, use it directly
  if (process.argv[2] && !process.argv[2].startsWith('-')) {
    try {
      return JSON.parse(process.argv[2]);
    } catch {
      errorExit('Invalid JSON in CLI argument. Pass JSON on stdin or as a valid JSON string.', 'invalid-input');
    }
  }

  // Otherwise read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    errorExit('No input provided. Pass JSON on stdin or as the first CLI argument.', 'no-input');
  }
  try {
    return JSON.parse(raw);
  } catch {
    errorExit('Invalid JSON on stdin.', 'invalid-input');
  }
}

async function handleThreads(input, base) {
  const params = new URLSearchParams();
  if (input.story) params.set('storyId', input.story);
  const query = params.toString() ? `?${params}` : '';

  const res = await fetch(`${base}/storybook-annotations/threads${query}`);
  if (!res.ok) {
    errorExit(`Server returned ${res.status}`, 'server-error');
  }
  let threads = await res.json();
  if (input.status) {
    if (input.status !== 'open' && input.status !== 'resolved') {
      errorExit('status must be "open" or "resolved"', 'invalid-input');
    }
    threads = threads.filter((t) => t.status === input.status);
  }
  return {
    ok: true,
    command: 'threads',
    count: threads.length,
    threads: threads.map((t) => ({
      id: t.id,
      storyId: t.anchor?.storyId,
      storyTitle: t.storyTitle,
      status: t.status,
      elementKey: t.anchor?.elementKey,
      firstMessage: t.messages?.[0]?.body?.slice(0, 120),
      messageCount: t.messages?.length,
    })),
  };
}

async function handleReply(input, base) {
  if (!input.id || !input.body) {
    errorExit('reply requires "id" and "body"', 'missing-required');
  }
  const author = input.author === 'human' ? 'human' : 'agent';
  const name = input.name ?? (author === 'agent' ? 'Agent' : 'Human');

  const res = await fetch(`${base}/storybook-annotations/threads/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: input.id,
      message: { author, authorName: name, body: input.body },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    errorExit(
      err.error ?? `Server returned ${res.status}`,
      err.error === 'thread-not-found' ? 'thread-not-found' : 'server-error',
    );
  }
  const thread = await res.json();
  return {
    ok: true,
    command: 'reply',
    threadId: thread.id,
    status: thread.status,
    messageCount: thread.messages.length,
    repliedAs: { author, name },
  };
}

async function handleResolve(input, base) {
  if (!input.id) {
    errorExit('resolve requires "id"', 'missing-required');
  }
  const status = input.reopen === true ? 'open' : 'resolved';

  const res = await fetch(`${base}/storybook-annotations/threads/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: input.id, status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    errorExit(
      err.error ?? `Server returned ${res.status}`,
      err.error === 'thread-not-found' ? 'thread-not-found' : 'server-error',
    );
  }
  const thread = await res.json();
  return {
    ok: true,
    command: 'resolve',
    threadId: thread.id,
    status: thread.status,
    action: input.reopen === true ? 'reopened' : 'resolved',
  };
}

// Main
const input = await readInput();

if (input.command === 'help' || process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(JSON.stringify(usage(), null, 2));
  process.exit(0);
}

if (!input.command) {
  errorExit('Missing "command" field. Use {"command": "help"} for usage.', 'missing-command');
}

const port = await discoverServerPort(input.port);
const base = buildBaseUrl(port);

let result;
switch (input.command) {
  case 'threads':
    result = await handleThreads(input, base);
    break;
  case 'reply':
    result = await handleReply(input, base);
    break;
  case 'resolve':
    result = await handleResolve(input, base);
    break;
  default:
    errorExit(`Unknown command "${input.command}". Use {"command": "help"} for usage.`, 'unknown-command');
}

console.log(JSON.stringify(result, null, 2));
