import React from 'react';
import { STORY_CHANGED } from 'storybook/internal/core-events';
import { addons, types } from 'storybook/manager-api';

import { Panel } from './components/Panel.tsx';
import { ToolToggle } from './components/ToolToggle.tsx';
import { ADDON_ID, PANEL_ID, TOOL_ID } from './constants.ts';
import { refreshStatuses } from './manager/status.ts';

addons.register(ADDON_ID, (api) => {
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

  void refreshStatuses();
  api.on(STORY_CHANGED, () => {
    void refreshStatuses();
  });
});
