import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';
import { getAuthenticatedUser } from '@/app/actions/auth';
import {
  calculateDirectorySize,
  getAssetsRoot,
  getSessionDir,
  readLastArchiveTimestamp,
  readSessionManifest,
  resolvePartPath,
  saveLastArchiveTimestamp,
  streamFileResponse,
  assertValidGzipFile,
} from '@/lib/assets-archive';
import { getHiretrackTempDir } from '@/lib/hiretrack-data-dir';
import { logger } from '@/lib/logger/logger.server';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function parsePartIndex(partParam: string | null): number | null {
  if (partParam === null || partParam === '') {
    return null;
  }
  const index = Number.parseInt(partParam, 10);
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  return index;
}

async function handlePartDownload(
  organizationId: string,
  sessionId: string,
  partIndex: number,
): Promise<NextResponse> {
  const sessionDir = getSessionDir(organizationId, sessionId);
  if (!existsSync(sessionDir)) {
    return NextResponse.json(
      { message: 'Archive session not found or expired' },
      { status: 404 },
    );
  }

  const manifest = await readSessionManifest(sessionDir);
  if (!manifest || manifest.sessionId !== sessionId) {
    return NextResponse.json(
      { message: 'Invalid archive session' },
      { status: 404 },
    );
  }

  if (partIndex >= manifest.parts) {
    return NextResponse.json({ message: 'Part index out of range' }, { status: 400 });
  }

  let partPath: string;
  try {
    partPath = resolvePartPath(
      sessionDir,
      manifest.partPrefix,
      manifest.partPad,
      partIndex,
    );
  } catch {
    return NextResponse.json({ message: 'Invalid part request' }, { status: 400 });
  }

  if (!existsSync(partPath)) {
    return NextResponse.json({ message: 'Part file not found' }, { status: 404 });
  }

  const stat = await fs.stat(partPath);

  return streamFileResponse({
    filePath: partPath,
    contentType: 'application/octet-stream',
    contentLength: stat.size,
  });
}

/** Legacy monolithic download: tar directly from assets, stream without readFile. */
async function handleMonolithicDownload(
  organizationId: string,
  assetsRoot: string,
): Promise<NextResponse> {
  const timestamp = Date.now().toString();
  const archiveFileName = `assets-${timestamp}.tar.gz`;
  const tempDir = path.join(
    getHiretrackTempDir(),
    `assets-legacy-${organizationId}-${timestamp}`,
  );
  const tempArchivePath = path.join(tempDir, archiveFileName);

  await fs.mkdir(tempDir, { recursive: true });

  const tarCommand = `tar -czf "${tempArchivePath}" -C "${assetsRoot}" .`;
  try {
    await execAsync(tarCommand);
  } catch (tarError) {
    logger.error({ tarError }, 'Legacy assets compression failed');
    await fs.rm(tempDir, { recursive: true, force: true });
    return NextResponse.json(
      { message: 'Failed to compress assets', error: String(tarError) },
      { status: 500 },
    );
  }

  try {
    await assertValidGzipFile(tempArchivePath);
  } catch (gzipError) {
    logger.error({ gzipError }, 'Legacy assets archive failed gzip validation');
    await fs.rm(tempDir, { recursive: true, force: true });
    return NextResponse.json(
      { message: 'Failed to validate assets archive' },
      { status: 500 },
    );
  }

  await saveLastArchiveTimestamp(organizationId);

  const stat = await fs.stat(tempArchivePath);

  return streamFileResponse({
    filePath: tempArchivePath,
    contentType: 'application/gzip',
    contentDisposition: `attachment; filename="${archiveFileName}"`,
    contentLength: stat.size,
    onComplete: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, ['admin']);
    if (!user) {
      return NextResponse.json({ message: 'Not Authorized' }, { status: 401 });
    }

    const { organizationId } = user;
    const assetsRoot = getAssetsRoot();
    const { searchParams } = new URL(req.url);
    const partParam = searchParams.get('part');
    const sessionId = searchParams.get('sessionId');

    if (!existsSync(assetsRoot)) {
      return NextResponse.json(
        { message: 'Assets directory does not exist' },
        { status: 404 },
      );
    }

    const partIndex = parsePartIndex(partParam);

    if (partIndex !== null) {
      if (!sessionId) {
        return NextResponse.json(
          { message: 'sessionId is required when downloading a part' },
          { status: 400 },
        );
      }
      return handlePartDownload(organizationId, sessionId, partIndex);
    }

    return handleMonolithicDownload(organizationId, assetsRoot);
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Error during assets archiving process',
    );
    return NextResponse.json(
      {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, ['admin']);
    if (!user) {
      return NextResponse.json({ message: 'Not Authorized' }, { status: 401 });
    }
    const { organizationId } = user;
    const assetsRoot = getAssetsRoot();

    if (!existsSync(assetsRoot)) {
      return NextResponse.json(
        { message: 'Assets directory does not exist' },
        { status: 404 },
      );
    }

    const totalSize = await calculateDirectorySize(assetsRoot);
    const lastArchivedAt = await readLastArchiveTimestamp(organizationId);
    const formattedDate = await getFormattedDate(req, lastArchivedAt as string);
    const assetsData = {
      name: 'assets',
      type: 'directory',
      path: 'assets',
      size: totalSize,
      lastArchivedAt: formattedDate || null,
    };

    return NextResponse.json(
      { message: 'Assets metadata retrieved successfully', data: assetsData },
      { status: 200 },
    );
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error retrieving assets metadata.');
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
