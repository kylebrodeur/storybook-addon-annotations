import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONBOARDING_PERSISTENCE,
  ONBOARDING_STATE_DEFAULTS,
  dismissNotification,
  dismissOnboarding,
  shouldShowOnboarding,
} from './onboarding.ts';

test('onboarding shows only while it is undismissed and the story has no threads', () => {
  assert.equal(shouldShowOnboarding(ONBOARDING_STATE_DEFAULTS, 0), true);
  assert.equal(shouldShowOnboarding(ONBOARDING_STATE_DEFAULTS, 2), false);
  assert.equal(shouldShowOnboarding(dismissOnboarding(ONBOARDING_STATE_DEFAULTS), 0), false);
});

test('dismissing one surface preserves the other surface flag', () => {
  assert.deepEqual(dismissOnboarding(ONBOARDING_STATE_DEFAULTS), {
    onboardingDismissed: true,
    notificationDismissed: false,
  });
  assert.deepEqual(dismissNotification(dismissOnboarding(ONBOARDING_STATE_DEFAULTS)), {
    onboardingDismissed: true,
    notificationDismissed: true,
  });
});

test('onboarding state persists in the manager store so it survives a reload', () => {
  assert.deepEqual(ONBOARDING_PERSISTENCE, { persistence: 'permanent' });
});
