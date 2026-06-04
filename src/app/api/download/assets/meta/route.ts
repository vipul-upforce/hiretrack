import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import {
  buildChunkedArchive,
  cleanupStaleSessions,
  getAssetsRoot,
  getSessionDir,
  saveLastArchiveTimestamp,
} from '@/lib/assets-archive';
import { logger } from '@/lib/logger/logger.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
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

    await cleanupStaleSessions(organizationId);

    const sessionId = randomUUID();
    const timestamp = Date.now().toString();
    const archiveFileName = `assets-${timestamp}.tar.gz`;
    const sessionDir = getSessionDir(organizationId, sessionId);

    try {
      const { manifest } = await buildChunkedArchive(
        assetsRoot,
        sessionDir,
        sessionId,
        archiveFileName,
      );

      await saveLastArchiveTimestamp(organizationId);

      return NextResponse.json(manifest, { status: 200 });
    } catch (buildError) {
      logger.error(
        { buildError, organizationId, sessionId, url: req.url },
        'Failed to build chunked assets archive',
      );
      return NextResponse.json(
        {
          message: 'Failed to prepare assets archive',
          error:
            buildError instanceof Error
              ? buildError.message
              : String(buildError),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error({ error, url: req.url }, 'Assets archive meta error');
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
