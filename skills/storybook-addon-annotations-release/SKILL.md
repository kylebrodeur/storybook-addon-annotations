---
name: storybook-addon-annotations-release
description: Use when releasing the Storybook Annotations addon, verifying its npm package, or integrating an exact published version into a Storybook consumer.
---

# Storybook Addon Annotations Release

Release and consumer installation are separate gates. Never call a package available until the registry exposes the exact version.

## Addon repository gates

From the addon repository:

```bash
npm run typecheck
npm test
npm run lint
npm run lint:anti-slop
npm run build
npm run build-storybook
npm pack --dry-run
```

Inspect the tarball contents. It must include runtime bundles, declarations, package shims, README, changelog, license, docs, the agent skill, and the release skill. It must not include local review JSONL, the agent CLI (`cli/`), or build-only scratch artifacts.

## Publish

For a scoped public package:

```bash
npm publish --access public --auth-type=web
```

Complete npm's browser authentication as the human account owner. Never ask an agent to collect or relay an authenticator OTP.

Verify directly after publication:

```bash
npm view @kylebrodeur/storybook-addon-annotations@VERSION \
  version dist.tarball dist.integrity --json
```

A registry 404 means publication is not complete.

## GitHub release

Create multiline notes in a file, then use:

```bash
gh release create vVERSION \
  --repo OWNER/storybook-addon-annotations \
  --title "vVERSION — Storybook Addon Annotations" \
  --notes-file /tmp/storybook-addon-annotations-vVERSION.md
```

Verify with `gh release view vVERSION --repo OWNER/storybook-addon-annotations`.

## Consumer install

Install the exact published version, not a floating range:

```bash
npm install --save-dev \
  @kylebrodeur/storybook-addon-annotations@VERSION
```

Register the package once in the consumer's Storybook `addons` array. Preserve existing framework, MCP, Docs, Vitest, A11y, Designs, Themes, and feature settings.

Run consumer typecheck/lint/build gates, then verify the live Storybook UI in a browser. Confirm the panel, toolbar, overlay, anchor resolution, create/save, replies, and no runtime error overlay.
