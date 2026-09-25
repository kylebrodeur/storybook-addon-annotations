# Release checklist

This checklist prepares `@kylebrodeur/storybook-addon-annotations` for a release without silently mutating consumer projects or attempting to restart Storybook from inside Storybook.

## Consumer setup

- [ ] Install the package as a development dependency.
- [ ] Register `@kylebrodeur/storybook-addon-annotations` in `.storybook/main.*`, or run `npx storybook-annotations init`.
- [ ] If `init` changes `.storybook/main.*`, restart Storybook manually.
- [ ] Confirm the Annotations panel and toolbar appear on a story route.
- [ ] Keep `.storybook-annotations.jsonl` ignored.

## Optional project files

- [ ] Create a Docs report only when the consumer wants one:
      `npx storybook-annotations add-docs --story-id <id>`.
- [ ] Add the example story only when the consumer wants one:
      `npx storybook-annotations add-example`.
- [ ] Restart Storybook manually if newly created stories or Docs files are not picked up automatically.

## Verification

Run from the package root:

```bash
npm run typecheck
npm test
npm run lint
npm run lint:anti-slop
npm run build
npm run build-storybook
npm pack --dry-run
```

Then inspect the pack contents and verify that only the intended public files are included. Do not publish until every command is green and the changelog/version are reviewed.
