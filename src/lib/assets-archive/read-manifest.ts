import fs from 'fs/promises';
import { existsSync } from 'fs';
import type { AssetsArchiveManifest } from './types';
import { getManifestPath } from './paths';

function isValidManifest(data: unknown): data is AssetsArchiveManifest {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  return (
    m.chunked === true &&
    typeof m.filename === 'string' &&
    typeof m.parts === 'number' &&
    m.parts > 0 &&
    typeof m.partPrefix === 'string' &&
    typeof m.partPad === 'number' &&
    typeof m.sessionId === 'string' &&
    typeof m.sha256 === 'string' &&
    typeof m.totalBytes === 'number'
  );
}

export async function readSessionManifest(
  sessionDir: string,
): Promise<AssetsArchiveManifest | null> {
  const manifestPath = getManifestPath(sessionDir);
  if (!existsSync(manifestPath)) {
    return null;
  }
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (!isValidManifest(parsed)) {
    return null;
  }
  return parsed;
}
