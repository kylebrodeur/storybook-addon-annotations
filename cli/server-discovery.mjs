/**
 * Server discovery for the Storybook Annotations CLI.
 *
 * Resolution order:
 * 1. Explicit `port` from the CLI input JSON
 * 2. STORYBOOK_PORT environment variable
 * 3. Probe common Storybook dev ports (6006, 6007, 6106, 6107)
 *
 * The first port that responds to a health check on the annotations API wins.
 */

const COMMON_PORTS = [6006, 6007, 6106, 6107];
const HEALTH_PATH = '/storybook-annotations/threads';

async function probePort(port, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}${HEALTH_PATH}`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverServerPort(explicitPort) {
  if (explicitPort) {
    const ok = await probePort(explicitPort);
    if (!ok) {
      throw new Error(
        `Storybook is not responding on port ${explicitPort}. Is the dev server running with the annotations addon mounted?`,
      );
    }
    return explicitPort;
  }

  const envPort = process.env.STORYBOOK_PORT;
  if (envPort) {
    const ok = await probePort(envPort);
    if (!ok) {
      throw new Error(`STORYBOOK_PORT is set to ${envPort} but no Storybook dev server is responding there.`);
    }
    return envPort;
  }

  for (const port of COMMON_PORTS) {
    if (await probePort(port)) return port;
  }

  throw new Error(
    `No Storybook dev server found on common ports (${COMMON_PORTS.join(', ')}). Start Storybook with the annotations addon, or pass port explicitly, or set STORYBOOK_PORT.`,
  );
}

export function buildBaseUrl(port) {
  return `http://127.0.0.1:${port}`;
}
