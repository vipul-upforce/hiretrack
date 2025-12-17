import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logsRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

function getFolderSizeWin(folderPath: string): number {
  let total = 0;

  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      total += getFolderSizeWin(fullPath);
    } else {
      total += stats.size;
    }
  }

  return total;
}

async function getPM2Logs(req: NextRequest) {
  const user = await getAuthenticatedUser(req, 'admin');
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isLinux = process.platform === 'linux';

  const logDir = isLinux
    ? path.join(process.env.HOME || '/root', '.pm2', 'logs')
    : 'C:/Users/Upforce/.pm2/logs';
  try {
    const files = fs.readdirSync(logDir);

    const filteredFiles = files.filter(
      (file) =>
        (file.endsWith('.log') || file.endsWith('.txt')) &&
        !file.endsWith('.gz'),
    );

    let sizeBytes = 0;

    if (isLinux) {
      try {
        const result = execSync(`du -sb '${logDir}'`).toString();
        sizeBytes = parseInt(result.split('\t')[0], 10) || 0;
      } catch (err) {
        logger.error({ err }, 'du command failed for PM2 Logs');
      }
    } else {
      sizeBytes = getFolderSizeWin(logDir);
    }

    const sizeMB = `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;

    return NextResponse.json({
      path: logDir,
      files: filteredFiles,
      sizeBytes,
      size: sizeMB,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to read PM2 log directory');
    return NextResponse.json(
      { error: 'Failed to read PM2 log directory' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return logsRateLimiter(req, getPM2Logs);
}
