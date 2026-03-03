import path from 'path';
import { promises as fs } from 'fs';
import logger from '@/lib/logger/';

/** Path to config.json in the parent of the current project root (e.g. monorepo root). */
export const PARENT_CONFIG_PATH = path.resolve(
  process.cwd(),
  '..',
  'config.json',
);

export type ReleaseChannel = 'beta' | 'staging' | 'production';

/**
 * Reads config.json from the parent directory and returns the release channel.
 * Used for version list and license flows that depend on beta/staging/production channel.
 *
 * @returns Promise<ReleaseChannel> - channel value from config.channel, defaults to production
 */
export async function getReleaseChannel(): Promise<ReleaseChannel> {
  try {
    const configRaw = await fs.readFile(PARENT_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configRaw) as { channel?: string };
    const channel = config.channel?.trim().toLowerCase();

    if (
      channel === 'beta' ||
      channel === 'staging' ||
      channel === 'production'
    ) {
      logger.info('releaseChannel', channel);
      return channel;
    }

    logger.warn(
      `Invalid or missing config.channel value "${config.channel}"; using default channel=production`,
    );
    return 'production';
  } catch (err) {
    logger.warn(
      'Could not read or parse config.json; using default channel=production',
      err,
    );
    return 'production';
  }
}
