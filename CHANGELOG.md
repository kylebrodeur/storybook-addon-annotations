# Changelog

## 0.2.0 — 2026-09-25

Agent-facing release.

- Agent skills now ship in `skills/`:
  - `skills/storybook-addon-annotations/SKILL.md` — install, register, anchor, review, verify.
  - `skills/storybook-addon-annotations-release/SKILL.md` — release gates, npm publish, GitHub release, exact-version consumer install.
- `skills/**/*` and the export CLI are included in the published package.
- `AGENTS.md` documents the skill location and repository gates.
- `README.md` documents the agent skills and updated package layout.

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
