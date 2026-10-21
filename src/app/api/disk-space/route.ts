import { NextRequest, NextResponse } from "next/server";
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logsRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';
/**
 * Recursively calculates the total size of a directory including all files and subdirectories.
 * This function includes hidden files and folders (those starting with '.').
 *
 * @param dirPath - The directory path to calculate size for
 * @returns Total size in bytes
 */
function calculateFolderSizeRecursive(dirPath: string): number {
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries.reduce((acc, entry) => {
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          return acc + calculateFolderSizeRecursive(fullPath);
        }
        if (entry.isFile()) {
          const fileStats = fs.statSync(fullPath);
          return acc + fileStats.size;
        }
        return acc;
      } catch {
        // Skip files/folders that can't be accessed (permissions, broken symlinks, etc.)
        return acc;
      }
    }, 0);
  } catch {
    // If directory can't be read, return 0
    return 0;
  }
}

/**
 * Gets the current user's home directory at runtime using Linux commands.
 * This is more reliable than environment variables which can be manipulated.
 * 
 * @returns The home directory path (e.g., '/root' or '/home/hiretrack')
 */
function getRuntimeHomeDirectory(): string {
  try {
    if (process.platform === 'win32') {
      // On Windows, use environment variable as fallback
      return process.env.HOME || process.env.USERPROFILE || os.homedir();
    }

    // On Linux/Mac, use getent to query /etc/passwd for the actual home directory
    // This is more reliable than environment variables
    try {
      const username = execSync('whoami', { encoding: 'utf-8' }).trim();
      const passwdEntry = execSync(`getent passwd ${username}`, { encoding: 'utf-8' }).trim();
      // Home directory is the 6th field (index 5) in /etc/passwd format
      // Format: username:password:uid:gid:gecos:home:shell
      const homeDir = passwdEntry.split(':')[5];
      if (homeDir && fs.existsSync(homeDir)) {
        return homeDir;
      }
    } catch {
      // Fallback: try reading /etc/passwd directly
      try {
        const username = execSync('whoami', { encoding: 'utf-8' }).trim();
        const passwdContent = fs.readFileSync('/etc/passwd', 'utf-8');
        const userLine = passwdContent.split('\n').find(line => line.startsWith(`${username}:`));
        if (userLine) {
          const homeDir = userLine.split(':')[5];
          if (homeDir && fs.existsSync(homeDir)) {
            return homeDir;
          }
        }
      } catch {
        // Last resort fallback
      }
    }

    // Final fallback
    return process.env.HOME || '/root';
  } catch (error) {
    logger.error({ error }, 'Failed to detect home directory, using fallback');
    return process.env.HOME || '/root';
  }
}

/**
 * Formats bytes to human-readable size string
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0B';

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Gets folder size using system command or recursive calculation
 */
function getFolderSize(folderPath: string): string {
  try {
    if (process.platform === 'win32') {
      const sizeBytes = calculateFolderSizeRecursive(folderPath);
      return formatSize(sizeBytes);
    }
    const result = execSync(`du -sb "${folderPath}"`, { encoding: 'utf-8' });
    const sizeBytes = parseInt(result.split('\t')[0], 10);
    if (!Number.isNaN(sizeBytes)) {
      return formatSize(sizeBytes);
    }
    const sizeBytesFallback = calculateFolderSizeRecursive(folderPath);
    return formatSize(sizeBytesFallback);
  } catch {
    const sizeBytes = calculateFolderSizeRecursive(folderPath);
    return formatSize(sizeBytes);
  }
}

function getDiskStats(checkPath: string) {
  try {
    let total = 0;
    let free = 0;
    let used = 0;

    if (process.platform === 'win32') {
      const driveLetter = path
        .parse(path.resolve(checkPath))
        .root.replace('\\', '');

      // Execute wmic command
      const output = execSync(
        `wmic logicaldisk where Caption="${driveLetter}" get FreeSpace,Size /value`,
        { encoding: 'utf-8' },
      );

      const lines = output.split('\n');
      lines.forEach((line) => {
        if (line.includes('Size='))
          total = parseInt(line.split('=')[1].trim(), 10);
        if (line.includes('FreeSpace='))
          free = parseInt(line.split('=')[1].trim(), 10);
      });

      used = total - free;
    } else {
      // Linux/Mac: Use df command
      // -B1 forces output in bytes
      const output = execSync(`df -B1 "${checkPath}"`, { encoding: 'utf-8' });

      const lines = output.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);

        // Index 1 = Total, Index 2 = Used, Index 3 = Available (Free)
        total = parseInt(parts[1], 10);
        used = parseInt(parts[2], 10);
        free = parseInt(parts[3], 10);
      }
    }

    const percentUsed = total > 0 ? ((used / total) * 100).toFixed(1) : '0';

    return {
      total: formatSize(total),
      free: formatSize(free),
      used: formatSize(used),
      raw: { total, free, used },
      percentUsed: `${percentUsed}%`,
    };
  } catch (error) {
    logger.error({ error }, 'Error fetching disk stats.');
    return {
      total: 'Unknown',
      free: 'Unknown',
      used: 'Unknown',
      percentUsed: '0%',
    };
  }
}

async function getDiskSpace(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request, "admin");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const rootKey = searchParams.get('root');
    const subPath = searchParams.get('path') || '';
    const getStats = searchParams.get('stats');

    const isWindows = process.platform === 'win32';
    // Detect home directory at runtime using Linux commands
    const userHome = getRuntimeHomeDirectory();

    const WINDOWS_PATHS: Record<string, string> = {
      nginx: process.env.NGINX_LOG_DIR || path.join(userHome, 'hiretrack', 'logs'),
      pm2: process.env.PM2_LOG_DIR || path.join(userHome, '.pm2', 'logs'),
      hiretrack: process.env.HIRETRACK_DATA_DIR || path.join(userHome, 'hiretrack'),
    };

    const LINUX_PATHS: Record<string, string> = {
      nginx: '/var/log/nginx',
      pm2: path.join(userHome, '.pm2', 'logs'),
      hiretrack: path.join(userHome, '.hiretrack'),
    };

    const SYSTEM_ROOT = isWindows ? 'C:/' : '/';

    // If query param ?stats=true is passed, return ONLY the disk stats
    if (getStats === 'true') {
      const diskStats = getDiskStats(SYSTEM_ROOT);
      return NextResponse.json({ success: true, diskStats });
    }

    if (rootKey) {
      const baseRootPath = isWindows
        ? WINDOWS_PATHS[rootKey]
        : LINUX_PATHS[rootKey];

      if (!baseRootPath) {
        return NextResponse.json(
          { error: 'Invalid root directory' },
          { status: 400 },
        );
      }

      const fullPath = path.resolve(baseRootPath, subPath);

      if (!fullPath.startsWith(path.resolve(baseRootPath))) {
        return NextResponse.json(
          { error: 'Access denied: Path outside root directory' },
          { status: 403 },
        );
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json(
          { error: 'Directory not found', path: fullPath },
          { status: 404 },
        );
      }

      const dirStat = fs.statSync(fullPath);
      if (!dirStat.isDirectory()) {
        return NextResponse.json(
          { error: 'Path is not a directory', path: fullPath },
          { status: 400 },
        );
      }

      const entries = fs.readdirSync(fullPath, { withFileTypes: true });

      const files = entries
        .map((entry) => {
          try {
            const filePath = path.join(fullPath, entry.name);
            const stats = fs.statSync(filePath);

            let size: string;
            let rawSize: number;

            if (stats.isDirectory()) {
              rawSize = calculateFolderSizeRecursive(filePath);
              size = formatSize(rawSize);
            } else {
              rawSize = stats.size;
              size = formatSize(rawSize);
            }

            return {
              name: entry.name,
              relativePath: path.join(subPath, entry.name),
              size,
              rawSize,
              type: stats.isDirectory() ? 'folder' : 'file',
              childrenCount: stats.isDirectory() ? 0 : undefined,
            };
          } catch {
            // Skip files/folders that can't be accessed
            return null;
          }
        })
        .filter(Boolean);

      return NextResponse.json({
        success: true,
        root: rootKey,
        currentPath: subPath,
        files,
      });
    }

    // Handle Root Folder Stats (Initial View)
    const baseFolders = ['nginx', 'pm2', 'hiretrack'];

    const foldersResult = baseFolders.map((key) => {
      const folderPath = isWindows ? WINDOWS_PATHS[key] : LINUX_PATHS[key];
      let size = '0B';
      try {
        size = getFolderSize(folderPath);
      } catch {
        // If calculation fails, size remains "0B"
        // Error is silently handled to prevent API failures
      }
      return {
        name: key,
        path: folderPath,
        size,
        type: 'folder',
      };
    });

    // Get System Disk Stats
    const diskStats = getDiskStats(SYSTEM_ROOT);

    return NextResponse.json({
      success: true,
      diskStats,
      folders: foldersResult,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'Disk folder read error.');
    return NextResponse.json(
      { error: 'Failed to retrieve disk usage' },
      { status: 500 },
    );
  }
}


export async function GET(request: NextRequest) {
  return logsRateLimiter(request, getDiskSpace);
}