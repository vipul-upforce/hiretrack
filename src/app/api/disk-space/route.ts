import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Recursively calculates the total size of a directory including all files and subdirectories.
 * This function includes hidden files and folders (those starting with '.').
 *
 * @param dirPath - The directory path to calculate size for
 * @returns Total size in bytes
 */
function calculateFolderSizeRecursive(dirPath: string): number {
  let totalSize = 0;

  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          // Recursively calculate subdirectory size
          totalSize += calculateFolderSizeRecursive(fullPath);
        } else if (entry.isFile()) {
          // Add file size
          const fileStats = fs.statSync(fullPath);
          totalSize += fileStats.size;
        }
        // Note: symlinks and other special files are handled by entry.isFile() check
      } catch {
        // Skip files/folders that can't be accessed (permissions, broken symlinks, etc.)
        // Continue processing other entries
        continue;
      }
    }
  } catch {
    // If directory can't be read, return 0
    return 0;
  }

  return totalSize;
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
 * Gets folder size using system command (Linux/Mac) or recursive calculation (Windows/fallback)
 */
function getFolderSize(folderPath: string): string {
  try {
    if (process.platform === 'win32') {
      // On Windows, use recursive calculation
      const sizeBytes = calculateFolderSizeRecursive(folderPath);
      return formatSize(sizeBytes);
    }
    // On Linux/Mac, try using 'du' command first (faster for large directories)
    // This includes hidden files by default
    const result = execSync(`du -sb "${folderPath}"`, { encoding: 'utf-8' });
    const sizeBytes = parseInt(result.split('\t')[0], 10);
    if (!isNaN(sizeBytes)) {
      return formatSize(sizeBytes);
    }
    // Fallback to recursive calculation if du fails
    const sizeBytesFallback = calculateFolderSizeRecursive(folderPath);
    return formatSize(sizeBytesFallback);
  } catch {
    // Fallback to recursive calculation on any error
    const sizeBytes = calculateFolderSizeRecursive(folderPath);
    return formatSize(sizeBytes);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rootKey = searchParams.get('root');
    const subPath = searchParams.get('path') || '';

    const isWindows = process.platform === 'win32';

    const WINDOWS_PATHS: Record<string, string> = {
      nginx: '/Users/UpforceTech/',
      pm2: '/Users/Upforce/.pm2/logs',
      hiretrack: '/Users/UpforceTech/hiretrack',
    };

    const LINUX_PATHS: Record<string, string> = {
      nginx: '/var/log/nginx',
      pm2: '/root/.pm2/logs',
      hiretrack: '/root/.hiretrack',
    };

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
    const result = baseFolders.map((key) => {
      const folderPath = isWindows ? WINDOWS_PATHS[key] : LINUX_PATHS[key];

      let size = '0B';
      try {
        // Use the unified getFolderSize function which handles both Windows and Linux
        // and includes all hidden files/folders
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

    return NextResponse.json({
      success: true,
      folders: result,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Disk folder read error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve disk usage' },
      { status: 500 },
    );
  }
}
