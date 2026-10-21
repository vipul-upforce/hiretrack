import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import { validateQueryParams } from '@/lib/inputValidation';
import { logger } from '@/lib/logger/logger.server';

export async function GET(request: NextRequest) {
  try {
    const validation = validateQueryParams(request.nextUrl.searchParams, {
      pathName: {
        required: true,
        type: 'string',
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid file path parameters', details: validation.errors },
        { status: 400 },
      );
    }

    // Get the pathname from query parameters
    const { searchParams } = new URL(request.url);
    const pathName = searchParams?.get('pathName');

    if (!pathName) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 },
      );
    }

    // SECURITY FIX: Define allowed directories based on actual implementation
    const projectRoot = process.cwd();
    const allowedDirectories = [
      '../assets/images/',
      '../assets/documents/',
      '../assets/organizations/',
      '../backups',
    ];

    // Normalize and validate the path
    const sanitizedPath = path.normalize(pathName);

    // Security check 1: Ensure path starts with allowed directories
    const isAllowedPath = allowedDirectories.some((allowedDir) => {
      const normalizedAllowedDir = path.normalize(allowedDir);
      return sanitizedPath.startsWith(normalizedAllowedDir);
    });

    if (!isAllowedPath) {
      return NextResponse.json(
        { error: 'Access denied - invalid file path' },
        { status: 403 },
      );
    }

    // Security check 2: Prevent path traversal attacks
    const resolvedPath = path.resolve(projectRoot, sanitizedPath);
    const allowedBasePaths = allowedDirectories.map((dir) =>
      path.resolve(projectRoot, dir),
    );

    const isWithinAllowedBase = allowedBasePaths.some((basePath) =>
      resolvedPath.startsWith(basePath),
    );

    if (!isWithinAllowedBase) {
      return NextResponse.json(
        { error: 'Access denied - path traversal detected' },
        { status: 403 },
      );
    }

    const filePath = resolvedPath;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error: unknown) {
      logger.error({ error, url: request.url }, 'File not found error.');
      return NextResponse.json(
        { error: `File not found${error?.toString()} ${filePath}` },
        { status: 404 },
      );
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);

    // Determine content type
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    // Create and return the response with proper security headers
    const fileName = path.basename(pathName);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        // "X-Frame-Options": "DENY",
        'X-Frame-Options': 'SAMEORIGIN',
        // "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'File serving error.');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
