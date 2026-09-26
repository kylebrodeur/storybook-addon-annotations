/**
 * The docs report template, shared by the in-Storybook setup path and the
 * `add-docs` CLI so both emit byte-identical files under one convention.
 */
export const DOCS_ENTRY = '@kylebrodeur/storybook-addon-annotations/blocks';

export function createDocsSource(title: string): string {
  return [
    "import { Meta } from '@storybook/addon-docs/blocks';",
    '',
    `import { Annotations } from '${DOCS_ENTRY}';`,
    '',
    `<Meta title=${JSON.stringify(title)} />`,
    '',
    '# Annotations',
    '',
    '<Annotations />',
    '',
  ].join('\n');
}
