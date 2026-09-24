import React from 'react';
import { CommentIcon } from '@storybook/icons';
import { IconButton } from 'storybook/internal/components';
import { useGlobals } from 'storybook/manager-api';

import { GLOBAL_KEY, TOOL_ID } from '../constants.ts';

/** Toolbar toggle for annotate mode. Writes the URL-shareable global. */
export function ToolToggle(): React.ReactElement {
  const [globals, updateGlobals] = useGlobals();
  const active = globals[GLOBAL_KEY] === 'on' || globals[GLOBAL_KEY] === true;
  return (
    <IconButton
      key={TOOL_ID}
      active={active}
      title={active ? 'Stop annotating' : 'Annotate'}
      aria-label={active ? 'Stop annotating' : 'Annotate'}
      aria-pressed={active}
      onClick={() => updateGlobals({ [GLOBAL_KEY]: active ? 'off' : 'on' })}
    >
      <CommentIcon />
    </IconButton>
  );
}
