import React from 'react';
import { STORY_CHANGED, STORY_RENDERED } from 'storybook/internal/core-events';
import { addons, types } from 'storybook/manager-api';
import { CheckIcon } from '@storybook/icons';

import { Panel } from './components/Panel.tsx';
import { ToolToggle } from './components/ToolToggle.tsx';
import { ADDON_ID, EVENTS, ONBOARDING_NOTIFICATION_ID, PANEL_ID, TOOL_ID } from './constants.ts';
import { refreshStatuses } from './manager/status.ts';
import { ONBOARDING_PERSISTENCE, ONBOARDING_STATE_DEFAULTS, dismissNotification } from './onboarding.ts';
import type { AnnotationsAddonState } from './types.ts';
addons.register(ADDON_ID, (api) => {
  let pendingThreadId: string | undefined;
  let pendingStoryId: string | undefined;
  const channel = api.getChannel();
  if (channel === undefined) return;

  const revealPendingThread = (): void => {
    if (pendingThreadId === undefined || pendingStoryId !== api.getCurrentStoryData()?.id) return;
    channel.emit(EVENTS.ACTIVATE_PIN, { threadId: pendingThreadId });
    pendingThreadId = undefined;
    pendingStoryId = undefined;
  };

  channel.on(EVENTS.OPEN_THREAD, (payload: { storyId: string; threadId: string }) => {
    pendingStoryId = payload.storyId;
    pendingThreadId = payload.threadId;
    api.selectStory(payload.storyId);
    api.setSelectedPanel(PANEL_ID);
  });
  channel.on(STORY_RENDERED, revealPendingThread);

  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Annotate',
    match: ({ viewMode }) => viewMode === 'story',
    render: () => <ToolToggle />,
  });

  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Annotations',
    match: ({ viewMode }) => viewMode === 'story',
    render: () => <Panel />,
  });

  const addonState: AnnotationsAddonState = {
    ...ONBOARDING_STATE_DEFAULTS,
    ...api.getAddonState<AnnotationsAddonState>(ADDON_ID),
  };
  if (!addonState.notificationDismissed) {
    api.addNotification({
      id: ONBOARDING_NOTIFICATION_ID,
      icon: <CheckIcon />,
      content: {
        headline: 'Annotations are ready',
        subHeadline: 'Open the Annotations panel to leave threaded review comments.',
      },
      duration: 7000,
      onClear: () => {
        void api.setAddonState(ADDON_ID, dismissNotification, ONBOARDING_PERSISTENCE);
      },
    });
  }

  void refreshStatuses();
  api.on(STORY_CHANGED, () => {
    void refreshStatuses();
  });
});
