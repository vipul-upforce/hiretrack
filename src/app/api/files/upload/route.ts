import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, AuthenticatedUser } from '@/app/actions/auth';
import connectToDatabase, { Settings, Job } from '@/lib/mongodb';
import { saveFileLocally, uploadFile, uploadFileToS3 } from '@/lib/fileUtils';
import { logger } from '@/lib/logger/logger.server';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

/**
 * Converts a file buffer to a data URL (data:type;base64,...)
 * This format is what the existing file utilities expect
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  const type = mimeType || 'application/octet-stream';
  return `data:${type};base64,${base64}`;
}

/**
 * Uploads a single file and returns the file object with URL
 */
async function processFileUpload(
  file: File,
  fileStorage: string,
  organizationId: string,
  folder: 'documents' | 'images' = 'documents',
): Promise<UploadedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || 'application/octet-stream';
  const fileName = file.name || `file_${Date.now()}`;
  const isImage = mimeType.startsWith('image/');
  const targetFolder = isImage ? 'images' : folder;

  // Convert to data URL for existing utilities
  const dataUrl = bufferToDataUrl(buffer, mimeType);

  let url = '';
  switch (fileStorage) {
    case 'cloudinary':
      url = await uploadFile(dataUrl, targetFolder, organizationId, fileName);
      break;
    case 's3':
      url = await uploadFileToS3(dataUrl, targetFolder, organizationId, fileName);
      break;
    default: // local
      url = await saveFileLocally(dataUrl, targetFolder, fileName);
      break;
  }

  return {
    id: uuidv4(),
    name: fileName,
    url,
    type: mimeType,
    size: file.size,
  };
}

/**
 * POST /api/files/upload
 * Accepts multipart/form-data with files
 * Public endpoint - can be used without authentication
 * Requires organizationId (or jobId) as query parameter for guest applications
 * Returns array of uploaded file objects with URLs
 */
export async function POST(request: NextRequest) {
  try {
    // Connect to database first
    await connectToDatabase();
    if (!Settings) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 },
      );
    }

    // Try to authenticate user (optional for public access)
    const userData = await getAuthenticatedUser(request);
    let organizationId: string | undefined;
    let fileStorage: string | undefined;

    if (userData) {
      // Authenticated user - use their organizationId
      const authUser = userData as AuthenticatedUser;
      organizationId = authUser.organizationId;
      fileStorage = authUser.fileStorage;
    } else {
      // Public access - get organizationId from query parameters
      const { searchParams } = new URL(request.url);
      const orgIdParam = searchParams.get('organizationId');
      const jobIdParam = searchParams.get('jobId');

      if (orgIdParam) {
        organizationId = orgIdParam;
      } else if (jobIdParam) {
        // Look up organizationId from jobId
        if (!Job) {
          return NextResponse.json(
            { error: 'Database not connected' },
            { status: 500 },
          );
        }
        try {
          const job = await Job.findById(new mongoose.Types.ObjectId(jobIdParam))
            .select('organizationId')
            .lean()
            .exec();
          
          if (!job) {
            return NextResponse.json(
              { error: 'Job not found' },
              { status: 404 },
            );
          }
          organizationId = String(job.organizationId || '');
        } catch (error) {
          logger.error({ error, jobId: jobIdParam }, 'Failed to fetch job');
          return NextResponse.json(
            { error: 'Invalid job ID' },
            { status: 400 },
          );
        }
      } else {
        return NextResponse.json(
          { error: 'organizationId or jobId query parameter is required for public access' },
          { status: 400 },
        );
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 },
      );
    }

    // Get organization settings to determine file storage type
    const settings = await Settings.findOne({ organizationId });
    const storageType = settings?.fileStorage?.storageType || fileStorage || 'local';

    // Parse multipart form data using Next.js native FormData API
    const formData = await request.formData();

    try {
      const uploadedFiles: UploadedFile[] = [];

      // Process single file (resume)
      const resumeFile = formData.get('resume');
      if (resumeFile && resumeFile instanceof File) {
        const file = await processFileUpload(
          resumeFile,
          storageType,
          organizationId,
          'documents',
        );
        uploadedFiles.push(file);
      }

      // Process multiple attachments
      const attachmentFiles = formData.getAll('attachments');
      for (const file of attachmentFiles) {
        if (file instanceof File) {
          const uploaded = await processFileUpload(
            file,
            storageType,
            organizationId,
            'documents',
          );
          uploadedFiles.push(uploaded);
        }
      }

      // Process custom field files
      const customFieldKeys = new Set<string>();
      for (const [key] of formData.entries()) {
        if (key.startsWith('customField_')) {
          const parts = key.split('_');
          if (parts.length >= 3) {
            const fieldKey = parts.slice(1, -1).join('_');
            customFieldKeys.add(fieldKey);
          }
        }
      }

      const customFieldFiles: Record<string, UploadedFile[]> = {};
      for (const fieldKey of customFieldKeys) {
        const allFiles: File[] = [];
        for (let i = 0; i < 10; i += 1) {
          const fileKey = `customField_${fieldKey}_${i}`;
          const file = formData.get(fileKey);
          if (file && file instanceof File) {
            allFiles.push(file);
          }
        }

        if (allFiles.length > 0) {
          customFieldFiles[fieldKey] = await Promise.all(
            allFiles.map((file) =>
              processFileUpload(file, storageType, organizationId, 'documents'),
            ),
          );
        }
      }

      return NextResponse.json({
        success: true,
        files: uploadedFiles,
        customFields: Object.keys(customFieldFiles).length > 0
          ? customFieldFiles
          : undefined,
      });
    } catch (error) {
      logger.error({ error }, 'Error processing file uploads');
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to process file uploads',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error({ error }, 'Error in file upload endpoint');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload files',
      },
      { status: 500 },
    );
  }
}
