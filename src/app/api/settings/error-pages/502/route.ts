import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export const runtime = 'nodejs';

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'public',
  'templates',
  '502.html',
);
const NGINX_TARGET_PATH = '/etc/nginx/error_pages/502.html';
const FALLBACK_SOURCE_PATH = '/APP/public/templates/502.html';

const resolveSourcePath = async () => {
  try {
    await fs.access(FALLBACK_SOURCE_PATH);
    return FALLBACK_SOURCE_PATH;
  } catch {
    return TEMPLATE_PATH;
  }
};

const ensureNginxDirectory = async (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    try {
      const dirPath = path.dirname(NGINX_TARGET_PATH);
      const mkdir = spawn('sudo', ['-n', 'mkdir', '-p', dirPath]);

      let stderr = '';
      mkdir.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      mkdir.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `sudo mkdir failed with code ${code}`));
        }
      });
      mkdir.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });

const attemptSudoTee = async (sourcePath: string): Promise<void> => {
  // Read the file asynchronously BEFORE creating the Promise
  const fileContents = await fs.readFile(sourcePath);

  // Use the Promise strictly for the event-based spawn process
  return new Promise<void>((resolve, reject) => {
    try {
      const tee = spawn('sudo', ['-n', '/usr/bin/tee', NGINX_TARGET_PATH], {
        stdio: ['pipe', 'ignore', 'pipe'],
      });

      tee.stdin.write(fileContents);
      tee.stdin.end();

      let stderr = '';
      tee.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      tee.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `sudo tee failed with code ${code}`));
        }
      });
      tee.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

const syncNginxTemplate = async () => {
  if (process.platform !== 'linux') {
    return { success: false, skipped: 'non-linux' };
  }

  const sourcePath = await resolveSourcePath();

  try {
    // 1. Attempt to create the directory first
    await ensureNginxDirectory();

    // 2. Write the file
    await attemptSudoTee(sourcePath);
    return { success: true, method: 'sudo-tee', sourcePath };
  } catch (error) {
    logger.warn({ error }, 'sudo tee (or mkdir) to Nginx path failed');
  }

  try {
    // Fallback: Ensure directory exists using standard Node FS (will only work if Node has write permissions)
    await fs.mkdir(path.dirname(NGINX_TARGET_PATH), { recursive: true });
    await fs.copyFile(sourcePath, NGINX_TARGET_PATH);
    return { success: true, method: 'copyFile', sourcePath };
  } catch (error) {
    logger.warn({ error }, 'Direct copy to Nginx path failed');
    return { success: false, error: 'nginx-sync-failed', sourcePath };
  }
};

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, 'admin');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const html = body?.html;

    if (typeof html !== 'string' || html.trim().length < 20) {
      return NextResponse.json(
        { error: 'Invalid HTML payload' },
        { status: 400 },
      );
    }

    if (html.length > 250_000) {
      return NextResponse.json(
        { error: 'HTML payload too large' },
        { status: 413 },
      );
    }

    await fs.mkdir(path.dirname(TEMPLATE_PATH), { recursive: true });
    await fs.writeFile(TEMPLATE_PATH, html, 'utf8');

    const nginxSync = await syncNginxTemplate();

    return NextResponse.json({ success: true, nginxSync });
  } catch (error) {
    logger.error({ error }, 'Failed to save 502 error template');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, 'admin');
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourcePath = await resolveSourcePath();
    const html = await fs.readFile(sourcePath, 'utf8');
    return NextResponse.json({ html });
  } catch (error) {
    logger.warn({ error }, 'Failed to read 502 error template');
    return NextResponse.json({ html: '' });
  }
}
