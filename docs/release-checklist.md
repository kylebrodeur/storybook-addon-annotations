# Release checklist

This checklist prepares `@kylebrodeur/storybook-addon-annotations` for a release without silently mutating consumer projects or attempting to restart Storybook from inside Storybook.

## Consumer setup

- [ ] Install the package as a development dependency; the postinstall hook registers it in `.storybook/main.*`.
- [ ] If scripts are blocked (pnpm allowlist, `--ignore-scripts`, CI), register `@kylebrodeur/storybook-addon-annotations` in `.storybook/main.*` manually.
- [ ] If registration changes `.storybook/main.*`, restart Storybook manually.
- [ ] Confirm the Annotations panel and toolbar appear on a story route.
- [ ] Store tracking is asked interactively at install and in the panel dialog; confirm the team's choice is applied.

## Optional project files

- [ ] The Docs report is generated from the setup dialog on the story in view; a new `.mdx` page is indexed without a restart.
- [ ] Restart Storybook manually if newly created stories are not picked up automatically.

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
