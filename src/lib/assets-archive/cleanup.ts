import fs from 'fs/promises';
import { existsSync } from 'fs';
import { SESSION_MAX_AGE_MS } from './types';
import { getOrgArchiveDir } from './paths';

/**
 * Remove archive sessions older than SESSION_MAX_AGE_MS for an organization.
 */
export async function cleanupStaleSessions(
  organizationId: string,
  maxAgeMs: number = SESSION_MAX_AGE_MS,
): Promise<void> {
  const orgDir = getOrgArchiveDir(organizationId);
  if (!existsSync(orgDir)) {
    return;
  }

  const now = Date.now();
  const entries = await fs.readdir(orgDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (entry) => {
        const sessionPath = `${orgDir}/${entry.name}`;
        try {
          const stat = await fs.stat(sessionPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            await fs.rm(sessionPath, { recursive: true, force: true });
          }
        } catch {
          // ignore per-session cleanup errors
        }
      }),
  );
}
