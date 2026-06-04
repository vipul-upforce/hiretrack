import path from 'path';
import {
  getAssetsArchiveRoot,
  getAssetsDir,
} from '@/lib/hiretrack-data-dir';
import { PART_PAD } from './types';

export function getAssetsRoot(): string {
  return getAssetsDir();
}

export function getArchiveRoot(): string {
  return getAssetsArchiveRoot();
}

export function getOrgArchiveDir(organizationId: string): string {
  return path.join(getArchiveRoot(), organizationId);
}

export function getSessionDir(
  organizationId: string,
  sessionId: string,
): string {
  return path.join(getOrgArchiveDir(organizationId), sessionId);
}

/** Part index i → filename under session dir (e.g. assets-123.tar.gz.part-003). */
export function formatPartFilename(
  partPrefix: string,
  partPad: number,
  partIndex: number,
): string {
  return `${partPrefix}${String(partIndex).padStart(partPad, '0')}`;
}

/**
 * Resolve part file path and ensure it stays inside the session directory.
 */
export function resolvePartPath(
  sessionDir: string,
  partPrefix: string,
  partPad: number,
  partIndex: number,
): string {
  const partName = formatPartFilename(partPrefix, partPad, partIndex);
  const resolved = path.resolve(sessionDir, partName);
  const sessionResolved = path.resolve(sessionDir);
  if (
    !resolved.startsWith(`${sessionResolved}${path.sep}`) &&
    resolved !== sessionResolved
  ) {
    throw new Error('Invalid part path');
  }
  return resolved;
}

export function getManifestPath(sessionDir: string): string {
  return path.join(sessionDir, 'manifest.json');
}
