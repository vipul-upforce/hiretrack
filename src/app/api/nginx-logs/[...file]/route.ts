import { NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { logger } from '@/lib/logger/logger.server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ file: string[] }> },
) {
  const { file } = await params;
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('mode') || 'tail'; // 'tail' | 'range'
  const startParam = parseInt(searchParams.get('start') || '0', 10);
  const endParam = parseInt(searchParams.get('end') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const query = searchParams.get('query')?.toLowerCase() || '';

  const logDir =
    process.env.NGINX_LOG_DIR ||
    (process.platform === 'linux'
      ? '/var/log/nginx'
      : path.join(os.homedir(), 'hiretrack', 'logs'));

  const filePath = path.join(logDir, ...file);

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Log file not found' },
        { status: 404 },
      );
    }

    const allLines: string[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, 'utf-8'),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!query || line.toLowerCase().includes(query)) {
        allLines.push(line);
      }
    }

    const totalLines = allLines.length;
    let slicedLines: string[] = [];
    let nextStart = 0;
    let nextEnd = 0;

    if (mode === 'tail') {
      const startIndex = Math.max(0, totalLines - limit);
      slicedLines = allLines.slice(startIndex, totalLines);

      nextStart = startIndex;
      nextEnd = totalLines;
    } else {
      const safeStart = Math.max(0, startParam);
      const safeEnd = Math.min(totalLines, endParam);

      slicedLines = allLines.slice(safeStart, safeEnd);
      nextStart = safeStart;
      nextEnd = safeEnd;
    }

    return NextResponse.json({
      content: slicedLines,
      totalLines,
      start: nextStart,
      end: nextEnd,
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Log file read error');
    return NextResponse.json(
      { error: 'Failed to read log file' },
      { status: 500 },
    );
  }
}
