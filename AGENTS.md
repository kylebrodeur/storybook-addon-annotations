# Agent instructions — storybook-addon-annotations

## Skills (read these first)

Reusable agent skills live in [`skills/`](skills/):

- [`skills/storybook-addon-annotations/SKILL.md`](skills/storybook-addon-annotations/SKILL.md) — install, register, anchor, review, and verify the addon in a consumer Storybook.
- [`skills/storybook-addon-annotations-release/SKILL.md`](skills/storybook-addon-annotations-release/SKILL.md) — release gates, npm publication, GitHub release, and installing an exact published version.

Read the install/interaction skill before changing any consumer Storybook configuration. Read the release skill before publishing or installing a specific version.

## Repository rules

- Keep agent skills in `skills/<skill-name>/SKILL.md` — not in `docs/`.
- Skill frontmatter requires `name` and `description`; the description starts with `Use when`.
- Run the full gate before any release: `npm run typecheck && npm test && npm run lint && npm run lint:anti-slop && npm run build && npm run build-storybook && npm pack --dry-run`.
- Never commit local review stores (`.storybook-annotations.jsonl`) or consumer annotation data.
- Do not claim a version is published until `npm view @kylebrodeur/storybook-addon-annotations@VERSION version` resolves.
- Do not collect or relay npm authenticator OTP codes; publication authentication is a human action.
