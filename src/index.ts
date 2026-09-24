import { definePreviewAddon } from 'storybook/internal/csf';

import addonAnnotations from './preview.tsx';

export default () => definePreviewAddon(addonAnnotations);
