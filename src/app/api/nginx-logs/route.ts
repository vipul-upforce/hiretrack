import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

export async function GET() {
  const isLinux = process.platform === 'linux';
  const logDir = isLinux ? '/var/log/nginx' : 'C:/Users/UpforceTech/hiretrack';

  try {
    const files = fs.readdirSync(logDir);

    const filteredFiles = files.filter(
      (file) => !file.endsWith('.gz') && !file.endsWith('.tsbuildinfo'),
    );

    let sizeBytes = 0;

    if (isLinux) {
      try {
        const output = execSync(`du -sb "${logDir}"`).toString();
        sizeBytes = parseInt(output.split('\t')[0], 10) || 0;
      } catch (err) {
        console.error('Failed to run du:', err);
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
    console.log(error);
    return NextResponse.json(
      { error: 'Failed to read nginx log directory' },
      { status: 500 },
    );
  }
}
