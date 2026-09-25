import { GLOBAL_KEY } from './constants.ts';

/**
 * The documented Storybook manager methods for driving globals. `api` is typed
 * with an `any` index signature upstream, so a typo like `setGlobals` compiles
 * and only fails at runtime; this narrow shape is the contract callers use.
 */
export interface GlobalsApi {
  updateGlobals: (globals: Record<string, string | boolean>) => void;
}

/** Turn annotate mode on. Called by onboarding and the toolbar toggle. */
export function enableAnnotationMode(api: GlobalsApi): void {
  api.updateGlobals({ [GLOBAL_KEY]: 'on' });
}
