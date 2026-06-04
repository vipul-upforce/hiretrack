import { existsSync } from 'fs';
import os from 'os';
import path from 'path';

/** Prefix used in DB and `/api/files?pathName=` URLs (do not change). */
export const ASSETS_PATH_PREFIX = '../assets/';

/** Prefix for backup file URLs. */
export const BACKUPS_PATH_PREFIX = '../backups';

/**
 * Root directory for HireTrack runtime data (assets, backups, config, temp).
 * Defaults to ~/.hiretrack; override with HIRETRACK_DATA_DIR.
 *
 * Avoids `process.cwd() + '..'` so Next.js standalone tracing does not pull in
 * the parent of the repo during `next build`.
 */
function legacyRepoDataDir(): string {
  return path.resolve(process.cwd(), '..');
}

export function getHiretrackDataDir(): string {
  const fromEnv = process.env.HIRETRACK_DATA_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const homeDir = path.join(os.homedir(), '.hiretrack');

  if (process.env.NODE_ENV === 'production') {
    return homeDir;
  }

  if (existsSync(path.join(homeDir, 'assets'))) {
    return homeDir;
  }

  const legacy = legacyRepoDataDir();
  if (existsSync(path.join(legacy, 'assets'))) {
    return legacy;
  }

  return homeDir;
}

export function getAssetsDir(): string {
  return path.join(getHiretrackDataDir(), 'assets');
}

export function getBackupsDir(): string {
  return path.join(getHiretrackDataDir(), 'backups');
}

export function getMetadataDir(): string {
  return path.join(getHiretrackDataDir(), 'metadata');
}

export function getHiretrackTempDir(): string {
  return path.join(getHiretrackDataDir(), 'temp');
}

export function getAssetsArchiveRoot(): string {
  return path.join(getHiretrackTempDir(), 'assets-archive');
}

export function getLicensePath(): string {
  return path.join(getHiretrackDataDir(), 'license.json');
}

export function getConfigPath(): string {
  return path.join(getHiretrackDataDir(), 'config.json');
}

/** Build a stored pathName for assets (e.g. `../assets/documents/file.pdf`). */
export function toAssetsPathName(...segments: string[]): string {
  return path.join('..', 'assets', ...segments).replace(/\\/g, '/');
}

function assertPathInsideBase(resolved: string, baseDir: string): void {
  const baseResolved = path.resolve(baseDir);
  const withSep = `${baseResolved}${path.sep}`;
  if (resolved !== baseResolved && !resolved.startsWith(withSep)) {
    throw new Error('Path traversal detected');
  }
}

/**
 * Resolve a stored pathName (../assets/..., ../backups/...) to an absolute path.
 */
export function resolveStoredPathName(pathName: string): string {
  const normalized = path.normalize(pathName);

  if (
    normalized.startsWith('../assets/') ||
    normalized.startsWith('..\\assets\\')
  ) {
    const relative = normalized.replace(/^(\.\.\/assets\/|\.\.\\assets\\)/, '');
    const resolved = path.resolve(getAssetsDir(), relative);
    assertPathInsideBase(resolved, getAssetsDir());
    return resolved;
  }

  if (
    normalized.startsWith('../backups') ||
    normalized.startsWith('..\\backups')
  ) {
    const relative = normalized.replace(/^(\.\.\/backups\/?|\.\.\\backups\\?)/, '');
    const resolved = path.resolve(getBackupsDir(), relative);
    assertPathInsideBase(resolved, getBackupsDir());
    return resolved;
  }

  return path.resolve(process.cwd(), normalized);
}
