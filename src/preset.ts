import path from 'node:path';

import { DEFAULT_STORE_FILE } from './constants.ts';
import type { DevServerApp } from './server/routes.ts';
import { mountRoutes } from './server/routes.ts';
import { createJsonlStore } from './store/jsonlStore.ts';
import type { AnnotationsPresetOptions } from './types.ts';

/**
 * Storybook dev-server preset hook. Mounts the annotations REST API + JSONL
 * store inside Storybook's own dev server process — nothing extra is spawned.
 * The store file resolves from options, then `SB_ANNOTATIONS_FILE`, then a
 * cwd-relative default.
 */
export const experimental_devServer = async (
  app: DevServerApp,
  options: AnnotationsPresetOptions = {},
): Promise<DevServerApp> => {
  const file = options.storeFile ?? process.env.SB_ANNOTATIONS_FILE ?? path.join(process.cwd(), DEFAULT_STORE_FILE);
  mountRoutes(app, createJsonlStore(file));
  return app;
};
