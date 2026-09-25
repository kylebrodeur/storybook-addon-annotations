import type { AnnotationsAddonState } from './types.ts';

/**
 * Onboarding/notification flags live in Storybook's addon state. Without an
 * explicit persistence option `setAddonState` defaults to `'none'`, so a
 * dismissal would be forgotten on the next page load. `'permanent'` writes to
 * localStorage via the manager store, which is what makes "only shows once"
 * actually true.
 */
export const ONBOARDING_PERSISTENCE = { persistence: 'permanent' } as const;

export const ONBOARDING_STATE_DEFAULTS: AnnotationsAddonState = {
  onboardingDismissed: false,
  notificationDismissed: false,
  setupDone: false,
  setupDialogOpen: false,
};

export function markSetupDone(state: AnnotationsAddonState): AnnotationsAddonState {
  return { ...state, setupDone: true, setupDialogOpen: false };
}

export function openSetupDialog(state: AnnotationsAddonState): AnnotationsAddonState {
  return { ...state, setupDialogOpen: true };
}

export function closeSetupDialog(state: AnnotationsAddonState): AnnotationsAddonState {
  return { ...state, setupDialogOpen: false };
}

/**
 * The first-run card is a setup affordance, not a permanent fixture: hide it
 * once the user dismissed it, and hide it for stories that already carry
 * review threads.
 */
export function shouldShowOnboarding(state: AnnotationsAddonState, threadCount: number): boolean {
  if (state.onboardingDismissed) return false;
  return threadCount === 0;
}

export function dismissOnboarding(state: AnnotationsAddonState): AnnotationsAddonState {
  return { ...state, onboardingDismissed: true };
}

export function dismissNotification(state: AnnotationsAddonState): AnnotationsAddonState {
  return { ...state, notificationDismissed: true };
}
