import path from 'path';
import { promises as fs } from 'fs';
import logger from '@/lib/logger/';

/** Path to config.json in the parent of the current project root (e.g. monorepo root). */
export const PARENT_CONFIG_PATH = path.resolve(
  process.cwd(),
  '..',
  'config.json',
);

/**
 * Reads config.json from the parent directory and returns the "beta" flag value.
 * Used for version list and license flows that depend on beta vs stable channel.
 *
 * @returns Promise<boolean> — true if config.beta === true, false otherwise or on read/parse error
 */
export async function getBetaFlag(): Promise<boolean> {
  try {
    const configRaw = await fs.readFile(PARENT_CONFIG_PATH, 'utf8');
    logger.info('configRaw', configRaw);
    const config = JSON.parse(configRaw) as { beta?: string };
    logger.info('config', config);
    const betaFlag = config.beta === 'true';
    logger.info('betaFlag', betaFlag);
    return betaFlag;
  } catch (err) {
    logger.warn(
      'Could not read or parse config.json; using default beta=false',
      err,
    );
    return false;
  }
}
