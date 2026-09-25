export interface AnnotationTheme {
  primary: string;
  positive: string;
  warning: string;
  lightest: string;
  defaultText: string;
}

export const ANNOTATION_THEME_VARS = {
  primary: '--storybook-annotations-primary',
  positive: '--storybook-annotations-positive',
  warning: '--storybook-annotations-warning',
  lightest: '--storybook-annotations-lightest',
  defaultText: '--storybook-annotations-default-text',
} as const;

const FALLBACK_THEME: AnnotationTheme = {
  primary: '#ff4785',
  positive: '#66bf3c',
  warning: '#e69d00',
  lightest: '#ffffff',
  defaultText: '#1f1f1f',
};

export function getAnnotationTheme(element: HTMLElement | null = null): AnnotationTheme {
  if (globalThis.window === undefined || globalThis.document === undefined) return FALLBACK_THEME;
  const source = element ?? globalThis.document.documentElement;
  const styles = globalThis.window.getComputedStyle(source);
  return {
    primary: styles.getPropertyValue(ANNOTATION_THEME_VARS.primary).trim() || FALLBACK_THEME.primary,
    positive: styles.getPropertyValue(ANNOTATION_THEME_VARS.positive).trim() || FALLBACK_THEME.positive,
    warning: styles.getPropertyValue(ANNOTATION_THEME_VARS.warning).trim() || FALLBACK_THEME.warning,
    lightest: styles.getPropertyValue(ANNOTATION_THEME_VARS.lightest).trim() || FALLBACK_THEME.lightest,
    defaultText: styles.getPropertyValue(ANNOTATION_THEME_VARS.defaultText).trim() || FALLBACK_THEME.defaultText,
  };
}

export function annotationThemeStyle(theme: AnnotationTheme) {
  return {
    [ANNOTATION_THEME_VARS.primary]: theme.primary,
    [ANNOTATION_THEME_VARS.positive]: theme.positive,
    [ANNOTATION_THEME_VARS.warning]: theme.warning,
    [ANNOTATION_THEME_VARS.lightest]: theme.lightest,
    [ANNOTATION_THEME_VARS.defaultText]: theme.defaultText,
  } satisfies Record<(typeof ANNOTATION_THEME_VARS)[keyof typeof ANNOTATION_THEME_VARS], string>;
}

export function annotationThemeFromStorybook(theme: {
  color: {
    primary: string;
    positive: string;
    warning: string;
    lightest: string;
    defaultText: string;
  };
}): AnnotationTheme {
  return {
    primary: theme.color.primary,
    positive: theme.color.positive,
    warning: theme.color.warning,
    lightest: theme.color.lightest,
    defaultText: theme.color.defaultText,
  };
}
