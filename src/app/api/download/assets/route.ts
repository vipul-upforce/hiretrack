import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';
import { getAuthenticatedUser } from '@/app/actions/auth';

const execAsync = promisify(exec);

// Path to store the last archive timestamp
const metadataDir = path.join(process.cwd(), '..', 'metadata');
const lastArchiveFile = path.join(metadataDir, 'last_archive.json');

// Save the last archive timestamp
async function saveLastArchiveTimestamp(organizationId: string) {
  const timestamp = new Date().toISOString();
  const metadata = { [organizationId]: timestamp };

  try {
    if (!existsSync(metadataDir)) {
      await fs.mkdir(metadataDir, { recursive: true });
    }
    await fs.writeFile(lastArchiveFile, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error saving last archive timestamp:', error);
  }
}

// Read the last archive timestamp
async function readLastArchiveTimestamp(
  organizationId: string,
): Promise<string | null> {
  try {
    if (existsSync(lastArchiveFile)) {
      const data = await fs.readFile(lastArchiveFile, 'utf-8');
      const metadata = JSON.parse(data);
      return metadata[organizationId] || null;
    }
  } catch (error) {
    console.error('Error reading last archive timestamp:', error);
  }
  return null;
}

// Recursively calculate the total size of all files in a directory
async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += await calculateDirectorySize(entryPath);
    } else if (entry.isFile()) {
      const stats = await fs.stat(entryPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, ['admin']);
    if (!user) {
      return NextResponse.json({ message: 'Not Authorized' }, { status: 401 });
    }
    const { organizationId } = user;
    const assetsRoot = path.join(process.cwd(), '..', 'assets');
    const timestamp = Date.now().toString();
    const archiveFileName = `assets-${timestamp}.tar.gz`;
    const tempDir = path.join(
      process.cwd(),
      '..',
      'temp',
      `assets-${timestamp}`,
    );
    const tempArchivePath = path.join(tempDir, archiveFileName);

    // Check if assets directory exists
    if (!existsSync(assetsRoot)) {
      return NextResponse.json(
        { message: 'Assets directory does not exist' },
        { status: 404 },
      );
    }

    // Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });

    // Copy assets to temporary directory
    const tempAssetsDir = path.join(tempDir, 'assets');
    await fs.mkdir(tempAssetsDir, { recursive: true });
    await fs.cp(assetsRoot, tempAssetsDir, { recursive: true });

    // Compress the assets to tar.gz
    const tarCommand = `tar -czf "${tempArchivePath}" -C "${tempAssetsDir}" .`;
    try {
      await execAsync(tarCommand);
    } catch (tarError) {
      console.error('Compression failed:', tarError);
      await fs.rm(tempDir, { recursive: true, force: true });
      return NextResponse.json(
        { message: 'Failed to compress assets', error: String(tarError) },
        { status: 500 },
      );
    }

    // Read the archive into memory
    const archiveBuffer = await fs.readFile(tempArchivePath);

    // Save the last archive timestamp
    await saveLastArchiveTimestamp(organizationId);

    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Send the archive in the response
    return new NextResponse(archiveBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${archiveFileName}"`,
        'Content-Length': archiveBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error during assets archiving process:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
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
    const assetsRoot = path.join(process.cwd(), '..', 'assets');

    // Check if assets directory exists
    if (!existsSync(assetsRoot)) {
      return NextResponse.json(
        { message: 'Assets directory does not exist' },
        { status: 404 },
      );
    }

    // Get metadata for the assets directory
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
    console.error('Error retrieving assets metadata:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
