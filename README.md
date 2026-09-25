![Storybook Addon Annotations](docs/media/storybook-addon-header.png)

# Storybook Addon Annotations

Leave visual annotations and threaded review comments directly on the Storybook canvas. Each annotation is anchored to a Storybook story and either a tagged element or a text selection, while the thread is managed from the Storybook panel.

> **Status:** `0.1.0` preview release. The local JSONL store is the default persistence adapter; a remote adapter can be added through the server boundary in a future release.

<video src="docs/media/storybook-addon-quick.mp4" controls muted loop playsinline width="100%"></video>

## Features

- Click the canvas to place a numbered annotation pin.
- Attach a pin to the nearest element marked with `data-annotation-anchor`.
- Select text to create a text-range annotation with a quote and normalized highlight rectangles.
- Reply to threads, resolve/reopen them, and delete them from the Annotations panel.
- Keep annotations stable across responsive canvas sizes using normalized fractions rather than viewport pixels.
- Persist local development annotations as one JSON object per line.
- Export a story's annotations as JSON for review tooling or later migration.
- Use Storybook globals to toggle annotation mode from the toolbar.

## Install

Install the published package as a Storybook development dependency:

```bash
npm install --save-dev @kylebrodeur/storybook-addon-annotations
```

Then register it in `.storybook/main.ts`:

```ts
const config = {
  addons: ['@kylebrodeur/storybook-addon-annotations'],
};

export default config;
```

The addon automatically registers its manager panel, toolbar control, preview decorator, and local development server preset.

You can either register it manually as shown above or run the explicit initializer:

```bash
npx storybook-annotations init
```

The initializer adds the addon registration and ignores the local JSONL review store. It never rewrites component files.

If the initializer changes `.storybook/main.*`, restart Storybook manually so the new configuration is loaded. The addon intentionally does not attempt to restart its parent Storybook process.

When the Annotations panel is open, its first-run card separates these actions:

- **Set up annotations** — explicitly updates the Storybook config and local-store ignore entry after confirmation.
- **Start annotating** — enables annotation mode for the current story immediately.
- **Not now** — dismisses onboarding without changing setup or runtime state.

## Mark stable anchors

Tag important component or element boundaries with a stable key:

```tsx
export function ProductCard() {
  return (
    <article data-annotation-anchor="product-card">
      <h2 data-annotation-anchor="product-card-title">Product card</h2>
      <button data-annotation-anchor="product-card-action">Buy now</button>
    </article>
  );
}
```

If no tagged ancestor is found, the annotation is attached to the story root. Anchor keys should be deterministic and should not contain generated React IDs.

## Story parameters

The addon accepts the following story or global parameters:

```ts
export default {
  parameters: {
    annotations: {
      disable: false,
      currentUser: 'Kyle',
    },
  },
};
```

- `disable: true` disables annotation behavior for the story.
- `currentUser` supplies the display name for messages created in the panel.

## Local persistence

The preset stores local threads in `.storybook-annotations.jsonl` by default. The file is intentionally a development artifact and should not be committed. Override the location through the preset options when needed:

```ts
addons: [
  {
    name: '@kylebrodeur/storybook-addon-annotations',
    options: {
      storeFile: '.tmp/storybook-review.jsonl',
    },
  },
];
```

## CLI helpers

The optional CLI helpers are explicit project-file operations. They are not required for canvas annotations or panel-only review.

Create an optional Docs report for one story:

```bash
npx storybook-annotations add-docs \
  --story-id demo--default \
  --title Review/Annotations \
  --output src/storybook/annotations.mdx
```

Create an optional example story:

```bash
npx storybook-annotations add-example
```

After adding a story or Docs page, restart Storybook if the running instance does not pick up the new file automatically. The addon does not provide a restart button or attempt to restart the Storybook process.

Both commands write only the requested file. Docs reports remain consumer-owned and the Annotations Docs block is read-only.

## Development

Run the addon Storybook locally:

```bash
pnpm install
pnpm start
```

Release validation:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm lint:anti-slop
pnpm build
pnpm build-storybook
npm pack --dry-run
```

The complete release checklist is in [`docs/release-checklist.md`](docs/release-checklist.md).

## Agent skills

Reusable agent skills ship in [`skills/`](skills/):

- [`skills/storybook-addon-annotations/SKILL.md`](skills/storybook-addon-annotations/SKILL.md) — install, register, anchor, review, and verify the addon.
- [`skills/storybook-addon-annotations-release/SKILL.md`](skills/storybook-addon-annotations-release/SKILL.md) — release gates, npm publication, GitHub release, and consumer install.

Agents should read the install/interaction skill before touching a consumer Storybook, and follow the release skill for any publish or version install.

## Package layout

- `dist/manager.js` — Storybook manager panel and toolbar bundle.
- `dist/preview.js` — preview decorator and canvas overlay bundle.
- `dist/blocks.js` — Docs blocks for annotation summaries and reveal actions.
- `dist/preset.js` — local server and Storybook preset integration.
- `dist/index.js` — public decorator/utility exports.
- `skills/` — agent skills for installation, interaction, and release.
- `scripts/` — project setup and export CLI entrypoints.

## License

MIT © Kyle Brodeur and contributors.
