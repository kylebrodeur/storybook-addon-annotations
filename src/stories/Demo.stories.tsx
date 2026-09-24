import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DATA_ANCHOR_ATTR } from '../constants.ts';

interface DemoProps {
  hideHeroTitle?: boolean;
}

/**
 * Demo surface for the annotations addon. `hero-title` and `cta-button` opt into
 * element-level anchoring; the middle paragraph is untagged (story-root
 * fallback). Toggling `hideHeroTitle` removes an anchored element to exercise
 * the orphan / "target unavailable" path against real DOM.
 */
function Demo({ hideHeroTitle = false }: DemoProps): React.ReactElement {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 420 }}>
      {!hideHeroTitle && (
        <h1 {...{ [DATA_ANCHOR_ATTR]: 'hero-title' }} style={{ marginTop: 0 }}>
          Welcome aboard
        </h1>
      )}
      <p>This untagged paragraph anchors to the whole component (story root) when annotated.</p>
      <button {...{ [DATA_ANCHOR_ATTR]: 'cta-button' }} type="button">
        Get started
      </button>
    </div>
  );
}

const meta: Meta<typeof Demo> = {
  title: 'Demo',
  component: Demo,
  args: { hideHeroTitle: false },
};

export default meta;

type Story = StoryObj<typeof Demo>;

export const Default: Story = {};

export const HeroHidden: Story = {
  args: { hideHeroTitle: true },
};
