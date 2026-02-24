import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getFileShare, validateAndRecordDownload } from '@/lib/fileShareUtils';
import { getFileFromProvider } from '@/lib/fileUtils';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';
import { FileStorageValues } from '@/app/dashboard/settings/components/file-storage/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } },
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID not provided' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const [fileShare, authenticatedUser] = await Promise.all([
      getFileShare(shareId),
      getAuthenticatedUser(request),
    ]);

    if (!fileShare) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Temporary fix: Allow public access to all shared files for now
    // TODO: Debug why isPublic is not being set correctly
    const allowPublicAccess = true;
    const isPublicAccess = allowPublicAccess || fileShare.isPublic;
    const userId = authenticatedUser?.id;

    if (!isPublicAccess && !authenticatedUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get client IP and user agent for tracking
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    const [downloadValidation, settings] = await Promise.all([
      validateAndRecordDownload(shareId, userId, ipAddress, userAgent),
      Settings!
        .findOne({
          organizationId: fileShare.organizationId,
        })
        .select('fileStorage')
        .lean()
        .exec(),
    ]);

    if (!downloadValidation.valid) {
      return NextResponse.json(
        { error: downloadValidation.error },
        { status: 403 },
      );
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'Organization settings not found' },
        { status: 404 },
      );
    }

    // Get file from storage provider
    const fileResult = await getFileFromProvider(
      fileShare.storagePath,
      settings.fileStorage as unknown as FileStorageValues,
      // fileShare.organizationId.toString(),
    );

    if (!fileResult.success) {
      return NextResponse.json({ error: fileResult.error }, { status: 500 });
    }

    // Create response with file
    const response = new NextResponse(fileResult.buffer);

    // Set headers
    response.headers.set('Content-Type', fileShare.mimeType);
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="${fileShare.originalFileName}"`,
    );
    response.headers.set('Content-Length', fileShare.fileSize.toString());
    response.headers.set('Cache-Control', 'private, max-age=3600');

    return response;
  } catch (error: unknown) {
    logger.error({ error }, 'Error downloading file');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to download file',
      },
      { status: 500 },
    );
  }
}
