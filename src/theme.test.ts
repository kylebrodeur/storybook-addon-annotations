import assert from 'node:assert/strict';
import test from 'node:test';

import { ANNOTATION_THEME_VARS, annotationThemeStyle, getAnnotationTheme } from './theme.ts';

test('preview theme shim returns safe fallback tokens without Storybook theme context', () => {
  const previousWindow = globalThis.window;
  Reflect.deleteProperty(globalThis, 'window');
  try {
    assert.deepEqual(getAnnotationTheme(), {
      primary: '#ff4785',
      positive: '#66bf3c',
      warning: '#e69d00',
      lightest: '#ffffff',
      defaultText: '#1f1f1f',
    });
  } finally {
    if (previousWindow !== undefined) globalThis.window = previousWindow;
  }
});

test('annotation theme lookup falls back when document globals are unavailable', () => {
  const previousDocument = globalThis.document;
  Reflect.deleteProperty(globalThis, 'document');
  try {
    assert.equal(getAnnotationTheme().primary, '#ff4785');
  } finally {
    if (previousDocument !== undefined) globalThis.document = previousDocument;
  }
});

test('theme shim emits semantic CSS variables for preview overlays', () => {
  const style = annotationThemeStyle({
    primary: '#123456',
    positive: '#234567',
    warning: '#345678',
    lightest: '#ffffff',
    defaultText: '#101010',
  });
  assert.deepEqual(style, {
    [ANNOTATION_THEME_VARS.primary]: '#123456',
    [ANNOTATION_THEME_VARS.positive]: '#234567',
    [ANNOTATION_THEME_VARS.warning]: '#345678',
    [ANNOTATION_THEME_VARS.lightest]: '#ffffff',
    [ANNOTATION_THEME_VARS.defaultText]: '#101010',
  });
});
