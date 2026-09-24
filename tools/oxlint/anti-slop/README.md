# anti-slop — neutral vendor source of truth

Generic Oxlint rules that reject **low-evidence TypeScript** (fabricated `as`
casts, `unknown` params/returns, `Record<string, unknown>` dictionaries, runtime
`typeof` narrowing, module mocking, etc.).

This directory is a **product-neutral copy** intended to be vendored into other
repos (e.g. `storybook-addon-annotations`). It contains **only** the generic
`anti-slop/*` rules — no PlantFluent/UofD design policy, no `folia/` group.

## Provenance

- **Source of truth:** `~/workspace/component-tools/anti-slop/`, a
  product-neutral vendor directory maintained separately from this addon.
- **Upstream:** the canonical `anti-slop` plugin —
  https://github.com/dmmulroy/anti-slop.
- The neutral source contains only the generic `anti-slop/*` rules. Product
  groups are intentionally excluded; this addon does not inherit policy from
  UofD, PlantFluent, or any sibling repository.

## How to vendor into a repo

Copy this whole directory into the target repo under `tools/oxlint/anti-slop/`,
then wire it in `oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint';
export default defineConfig({
  jsPlugins: [{ name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' }],
  rules: {
    'anti-slop/no-chained-type-assertions': 'error',
    'anti-slop/no-conditional-empty-object-spread': 'error',
    'anti-slop/no-known-value-widening': 'error',
    'anti-slop/no-module-mocking': 'error',
    'anti-slop/no-object-parameters': 'error',
    'anti-slop/no-reflect-apply': 'error',
    'anti-slop/no-reflect-get': 'error',
    'anti-slop/no-runtime-typeof': 'error',
    'anti-slop/no-shape-in-symbol-names': 'error',
    'anti-slop/no-unknown-parameters': 'error',
    'anti-slop/no-unknown-returns': 'error',
    'anti-slop/no-unknown-type-aliases': 'error',
    'anti-slop/no-unsafe-dictionary-type': 'error',
    'anti-slop/no-widen-then-assert': 'error',
    'anti-slop/require-safety-comment-for-type-assertion': 'error',
  },
});
```

Requires `oxlint` and `@oxlint/plugins` as devDependencies.

## Do not launder types to pass

Never add `as any` / `as unknown as`, suppress a rule, downgrade severity, or
gut a comment to silence a finding. Fix the evidence: parse at the I/O boundary
(Zod), use `satisfies`, name the shape.

## Updating

These generic rules are upstream-owned — do not hand-edit. To update, re-copy
from the upstream plugin (or the folia-app vendored tree) into this directory.
