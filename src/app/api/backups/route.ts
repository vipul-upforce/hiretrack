import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function GET(req: NextRequest) {
  try {
    const backupsDir = path.join(process.cwd(), '..', 'backups');
    const session = await getAuthenticatedUser(req, 'admin');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (file) => {
          const filePath = path.join(backupsDir, file.name);
          const stats = await fs.stat(filePath);

          const formattedDate = await getFormattedDate(
            req,
            stats.birthtime,
            true,
          );
          return {
            name: file.name,
            url: `/api/files?pathName=../backups/${encodeURIComponent(file.name)}`,
            createdAt: formattedDate,
            size: stats.size,
          };
        }),
    );

    return NextResponse.json({ files });
  } catch (error: unknown) {
    logger.error({ error, url: req.url }, 'Error during listing backup files');
    return NextResponse.json(
      {
        error: 'Could not list backup files',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
