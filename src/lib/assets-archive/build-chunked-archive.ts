import { exec } from 'child_process';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { assertValidGzipFile } from './verify-gzip';
import type { AssetsArchiveManifest, BuildChunkedArchiveResult } from './types';
import {
  MANIFEST_FILENAME,
  PART_PAD,
  PART_SIZE_MB,
  PART_SIZE_BYTES,
} from './types';

const execAsync = promisify(exec);

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function listPartFiles(
  sessionDir: string,
  partPrefix: string,
): Promise<string[]> {
  const entries = await fs.readdir(sessionDir);
  return entries
    .filter(
      (name) => name.startsWith(partPrefix) && name !== MANIFEST_FILENAME,
    )
    .sort();
}

async function sumPartBytes(
  sessionDir: string,
  partNames: string[],
): Promise<number> {
  let total = 0;
  for (const name of partNames) {
    const stat = await fs.stat(path.join(sessionDir, name));
    total += stat.size;
  }
  return total;
}

/**
 * Build a gzip tarball from assetsRoot, split into ~50MB parts, write manifest.
 */
export async function buildChunkedArchive(
  assetsRoot: string,
  sessionDir: string,
  sessionId: string,
  archiveFileName: string,
): Promise<BuildChunkedArchiveResult> {
  await fs.mkdir(sessionDir, { recursive: true });

  const archivePath = path.join(sessionDir, archiveFileName);
  const partPrefix = `${archiveFileName}.part-`;

  const tarCommand = `tar -czf "${archivePath}" -C "${assetsRoot}" .`;
  await execAsync(tarCommand);

  await assertValidGzipFile(archivePath);

  const stat = await fs.stat(archivePath);
  const totalBytes = stat.size;
  const sha256 = await sha256File(archivePath);

  const partPrefixPath = path.join(sessionDir, partPrefix);
  const splitCommand = `split -b "${PART_SIZE_MB}M" -d -a ${PART_PAD} "${archivePath}" "${partPrefixPath}"`;
  await execAsync(splitCommand);

  const partNames = await listPartFiles(sessionDir, partPrefix);
  const partCount = partNames.length;

  if (partCount === 0) {
    throw new Error('split produced no part files');
  }

  const partsTotalBytes = await sumPartBytes(sessionDir, partNames);
  if (partsTotalBytes !== totalBytes) {
    throw new Error(
      `Part files total ${partsTotalBytes} bytes, expected ${totalBytes}`,
    );
  }

  await fs.unlink(archivePath);

  const manifest: AssetsArchiveManifest = {
    filename: archiveFileName,
    chunked: true,
    partSizeBytes: PART_SIZE_BYTES,
    parts: partCount,
    totalBytes,
    sha256,
    partPrefix,
    partPad: PART_PAD,
    sessionId,
  };

  await fs.writeFile(
    path.join(sessionDir, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return { manifest, sessionDir };
}
