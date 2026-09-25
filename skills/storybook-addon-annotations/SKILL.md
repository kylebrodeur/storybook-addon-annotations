---
name: storybook-addon-annotations
description: Use when an agent needs to install, configure, inspect, or interact with Storybook visual annotations, anchored review threads, or the local annotation store.
---

# Storybook Addon Annotations

This addon is a Storybook review surface. It attaches visual evidence to rendered implementation elements and supports threaded human/agent discussion. It is not the design source of truth and does not automatically execute agents.

## Discover the package

```bash
npm view @kylebrodeur/storybook-addon-annotations version dist.tarball
npm install --save-dev @kylebrodeur/storybook-addon-annotations
```

Register the addon once in the consumer's `.storybook/main.*` `addons` array:

```ts
addons: [
  '@kylebrodeur/storybook-addon-annotations',
  // existing addons
];
```

Do not also register its manager/preview entries through a second local preset. Restart Storybook after changing configuration; the addon does not restart its parent process.

One-time project setup is available through:

```bash
npx storybook-annotations init
```

Review the generated diff. Setup may update `.storybook/main.*` and `.gitignore`; it must not rewrite component source.

## Create durable anchors

Use semantic, stable DOM attributes on component boundaries:

```tsx
<article data-annotation-anchor="product-card">
  <h2 data-annotation-anchor="product-card-title">Product card</h2>
  <button data-annotation-anchor="product-card-action">Buy now</button>
</article>
```

Prefer explicit anchors over generated classes, DOM indexes, CSS selectors, or pixel coordinates. If no tagged ancestor is found, the addon falls back to the story root; report that fallback as lower-confidence attachment evidence.

## Review workflow

1. Open the target story in Storybook.
2. Open the Annotations panel or activate the annotation toolbar.
3. Click the canvas for a point annotation, or select text for a text-range annotation.
4. Confirm the target label/anchor shown in the panel.
5. Write and save a concise review message.
6. Reply in the thread for follow-up; resolve/reopen for lifecycle state.
7. Use reveal, filtering, selection, bulk status actions, and delete from the panel as needed.

A thread has two independent parts: visual placement and structured anchor data. Do not claim component attachment without checking the anchor key in the panel or exported data.

## Store and export rules

The default persistence is local JSONL through the Storybook development server. Keep `.storybook-annotations.jsonl` and other local review stores ignored and uncommitted. A consumer may configure a separate `storeFile` intentionally.

Optional consumer-owned file helpers:

```bash
npx storybook-annotations add-docs \
  --story-id demo--default \
  --title Review/Annotations \
  --output src/storybook/annotations.mdx

npx storybook-annotations add-example
```

Docs/JSONL/Markdown exports are review evidence. They do not replace source changes or design artifacts.

## Agent verification

For addon or consumer changes, run the applicable checks:

```bash
npm run typecheck
npm test
npm run build
npm run build-storybook
```

Then inspect the real Storybook browser surface. Confirm the manager panel, toolbar, preview overlay, anchor label, create/save flow, reply flow, and absence of a runtime error overlay. A successful production build alone does not prove interaction behavior.

## Boundaries and common mistakes

- Do not register the addon twice.
- Do not use generated CSS classes as anchors.
- Do not commit local annotation JSONL.
- Do not confuse Storybook MCP Agentic Review with this visual annotation/thread system.
- Do not assume Firebase or remote synchronization exists; the shipped default is local persistence.
- Do not assume automatic agent execution exists; replies are manual/programmatic thread replies.
- Keep Pen/design authority, React source authority, and review evidence separate.
