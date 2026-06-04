import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { getMetadataDir } from '@/lib/hiretrack-data-dir';
import { logger } from '@/lib/logger/logger.server';

const metadataDir = getMetadataDir();
const lastArchiveFile = path.join(metadataDir, 'last_archive.json');

export async function saveLastArchiveTimestamp(
  organizationId: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const metadata: Record<string, string> = { [organizationId]: timestamp };

  try {
    if (!existsSync(metadataDir)) {
      await fs.mkdir(metadataDir, { recursive: true });
    }
    await fs.writeFile(lastArchiveFile, JSON.stringify(metadata, null, 2));
  } catch (error) {
    logger.error({ error }, 'Error saving last archive timestamp.');
  }
}

export async function readLastArchiveTimestamp(
  organizationId: string,
): Promise<string | null> {
  try {
    if (existsSync(lastArchiveFile)) {
      const data = await fs.readFile(lastArchiveFile, 'utf-8');
      const metadata = JSON.parse(data) as Record<string, string>;
      return metadata[organizationId] ?? null;
    }
  } catch (error) {
    logger.error({ error }, 'Error reading last archive timestamp.');
  }
  return null;
}

export async function calculateDirectorySize(dirPath: string): Promise<number> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return calculateDirectorySize(entryPath);
      }
      if (entry.isFile()) {
        const stats = await fs.stat(entryPath);
        return stats.size;
      }
      return 0;
    }),
  );
  return sizes.reduce((sum, n) => sum + n, 0);
}
