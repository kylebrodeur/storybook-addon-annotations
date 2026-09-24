export const ADDON_ID = 'kylebrodeur-annotations';
export const PANEL_ID = `${ADDON_ID}/panel`;
export const TOOL_ID = `${ADDON_ID}/tool`;

/** Globals key driving annotate mode. Value is `'on' | 'off'`, default `'off'`. */
export const GLOBAL_KEY = 'kylebrodeurAnnotations';

/** Storybook status-store type id (sidebar badges + built-in status filter). */
export const STATUS_TYPE_ID = 'kylebrodeur-annotations';
export const OPEN_STATUS_VALUE = 'status-value:warning';

/** Channel events. Annotate mode is a Storybook global, not an event. */
export const EVENTS = {
  REQUEST_THREADS: `${ADDON_ID}/request-threads`,
  PRESENT_THREADS: `${ADDON_ID}/present-threads`,
  CREATE_GESTURE: `${ADDON_ID}/create-gesture`,
  PRESENT_DRAFT: `${ADDON_ID}/present-draft`,
  ACTIVATE_PIN: `${ADDON_ID}/activate-pin`,
  MOVE_PIN: `${ADDON_ID}/move-pin`,
  REVEAL_THREAD: `${ADDON_ID}/reveal-thread`,
  ORPHAN_REPORT: `${ADDON_ID}/orphan-report`,
} as const;

/** Element-level anchoring: a component opts in by tagging an element with this attribute. */
export const DATA_ANCHOR_ATTR = 'data-annotation-anchor';
/** Sentinel elementKey meaning "whole component / story root". */
export const STORY_ROOT_KEY = '__story_root__';

/** Same-origin REST base mounted inside Storybook's own dev server. */
export const API_BASE = '/kylebrodeur-annotations';

/** Per-story parameters key: `parameters.annotations`. */
export const PARAM_KEY = 'annotations';

/** Default flat JSONL store file (one thread per line), relative to cwd. */
export const DEFAULT_STORE_FILE = '.storybook-annotations.jsonl';
