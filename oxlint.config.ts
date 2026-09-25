import { defineConfig } from 'oxlint';

// Anti-slop config for storybook-addon-annotations.
// Generic low-evidence-TypeScript rules are vendored at `tools/oxlint/anti-slop/`
// from a product-neutral source of truth (see that dir's README for provenance).
// This addon deliberately vendors ONLY the generic `anti-slop/*` group — no
// product-specific policy. Runs alongside ESLint; invoke via `npm run lint:anti-slop`.
// Oxlint honors `.gitignore`, so build output (dist/, storybook-static/) needs no entry here.
export default defineConfig({
  ignorePatterns: ['tools/oxlint/anti-slop/**', 'scripts/**'],
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
