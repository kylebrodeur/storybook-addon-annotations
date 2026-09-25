# Changelog

## 0.1.1 — 2026-09-25

Patch release: agent skills, plus fixes for two broken first-run paths.

### Added

- Agent skills now ship in `skills/`:
  - `skills/storybook-addon-annotations/SKILL.md` — install, register, anchor, review, verify.
  - `skills/storybook-addon-annotations-release/SKILL.md` — release gates, npm publish, GitHub release, exact-version consumer install.
- `skills/**/*` and the export CLI are included in the published package.
- `AGENTS.md` documents the skill location and repository gates.

### Fixed

- **Onboarding no longer reappears after dismissal.** `setAddonState` defaults to `persistence: 'none'`, so the dismissal flags were never written and the first-run card returned on every page load. Both onboarding and notification flags now persist, and the notification records dismissal from its 7s timeout as well as the dismiss button.
- **"Start annotating" now enables annotation mode.** It called `api.setGlobals()`, which is not a Storybook manager method (the name only exists as the `SET_GLOBALS` event string), so the click threw `TypeError: api.setGlobals is not a function`. It now calls `updateGlobals` through a narrow, typed contract.

### Changed

- CI: removed the `release.yml` workflow, which ran an unattended npm publish (`auto shipit`) on every push. Publishing is a deliberate, human-authenticated step.
- CI: `build.yml` now uses Node 22.18, drops the redundant Node matrix, and runs `typecheck`, `test`, and `lint:anti-slop`, which it previously skipped.
- Corrected the `packageManager` integrity hash in `package.json`, which prevented corepack from installing pnpm at all.

## 0.1.0 — 2026-09-24

Preview release.

- Visual point and text-range annotations on the Storybook canvas.
- Threaded replies with resolve/reopen and delete actions.
- Local atomic JSONL persistence.
- Storybook manager panel, toolbar mode, preview overlay, and Docs blocks.
- Normalized anchors that survive responsive canvas changes.
- First-run onboarding with separate project setup, canvas annotation, and dismissal actions.
- Explicit `storybook-annotations init`, `add-docs`, and `add-example` CLI commands.
- Native Storybook transient notification for addon availability.
- Manual restart guidance after config/story/docs file changes; no restart button or parent-process control.
- Storybook-themed reply and draft textareas.
