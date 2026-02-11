import { NextRequest } from 'next/server';
import formidable from 'formidable';
import { Readable } from 'stream';

/**
 * Converts a file buffer to a data URL (data:type;base64,...)
 * This format is what handleSingleFile and handleFileAttachments expect
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  const type = mimeType || 'application/octet-stream';
  return `data:${type};base64,${base64}`;
}

/**
 * Parses multipart/form-data request using formidable and converts files to data URLs
 * Returns data object in the same format as JSON requests
 */
export async function parseCandidateFormData(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Request is not multipart/form-data');
  }

  // Get boundary from content-type
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) {
    throw new Error('Missing boundary in Content-Type header');
  }

  // Get the raw body
  const body = await request.arrayBuffer();
  const buffer = Buffer.from(body);

  // Create a promise-based wrapper for formidable
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB
      keepExtensions: true,
      multiples: true,
    });

    // Create a readable stream from the buffer
    const stream = Readable.from(buffer);

    // Create a mock request object
    const mockReq = {
      headers: {
        'content-type': contentType,
      },
      on: (event: string, handler: (...args: any[]) => void) => {
        if (event === 'data') {
          stream.on('data', handler);
        } else if (event === 'end') {
          stream.on('end', handler);
        } else if (event === 'error') {
          stream.on('error', handler);
        }
        return mockReq;
      },
      pipe: (dest: any) => {
        stream.pipe(dest);
        return dest;
      },
    } as any;

    // Parse the form
    form.parse(mockReq, async (err, fields, files) => {
      if (err) {
        reject(new Error(`Failed to parse form data: ${err.message}`));
        return;
      }

      try {
        // Get JSON payload
        const payloadStr = Array.isArray(fields.payload)
          ? fields.payload[0]
          : fields.payload;
        if (!payloadStr || typeof payloadStr !== 'string') {
          reject(new Error('Missing payload field in form data'));
          return;
        }

        const data = JSON.parse(payloadStr) as Record<string, unknown>;

        // Convert resume file to data URL if present
        const resumeFile = Array.isArray(files.resume)
          ? files.resume[0]
          : files.resume;
        if (resumeFile && !Array.isArray(resumeFile)) {
          const fileBuffer = await readFileBuffer(resumeFile);
          const resumeDataUrl = bufferToDataUrl(
            fileBuffer,
            resumeFile.mimetype || 'application/pdf',
          );
          data.resume = {
            ...(data.resume && typeof data.resume === 'object' ? data.resume : {}),
            url: resumeDataUrl,
            name: resumeFile.originalFilename || resumeFile.newFilename,
            size: resumeFile.size,
            type: resumeFile.mimetype || 'application/pdf',
          };
        }

        // Convert attachment files to data URLs if present
        const attachmentFiles = Array.isArray(files.attachments)
          ? files.attachments
          : files.attachments
            ? [files.attachments]
            : [];

        if (attachmentFiles.length > 0) {
          const attachments = Array.isArray(data.attachments)
            ? data.attachments
            : [];
          const newAttachments = await Promise.all(
            attachmentFiles.map(async (file) => {
              if (!Array.isArray(file)) {
                const fileBuffer = await readFileBuffer(file);
                const url = bufferToDataUrl(
                  fileBuffer,
                  file.mimetype || 'application/pdf',
                );
                return {
                  id: crypto.randomUUID(),
                  name: file.originalFilename || file.newFilename,
                  url,
                  type: file.mimetype || 'application/pdf',
                  size: file.size,
                };
              }
              return null;
            }),
          );

          // Merge new attachments with existing ones
          data.attachments = [...attachments, ...newAttachments.filter(Boolean)];
        }

        // Handle custom field files
        const customFieldKeys = new Set<string>();
        for (const key in files) {
          if (key.startsWith('customField_')) {
            const parts = key.split('_');
            if (parts.length >= 3) {
              const fieldKey = parts.slice(1, -1).join('_');
              customFieldKeys.add(fieldKey);
            }
          }
        }

        if (customFieldKeys.size > 0 && data.customFields) {
          const customFields = data.customFields as Record<string, unknown>;
          for (const fieldKey of customFieldKeys) {
            const allFiles: formidable.File[] = [];
            for (let i = 0; i < 10; i += 1) {
              const fileKey = `customField_${fieldKey}_${i}`;
              const file = files[fileKey];
              if (file) {
                if (Array.isArray(file)) {
                  allFiles.push(...file);
                } else {
                  allFiles.push(file);
                }
              }
            }

            if (allFiles.length > 0 && Array.isArray(customFields[fieldKey])) {
              const existingField = customFields[fieldKey] as Array<{
                url?: string;
                name?: string;
              }>;
              const newFieldFiles = await Promise.all(
                allFiles.map(async (file) => {
                  const fileBuffer = await readFileBuffer(file);
                  const url = bufferToDataUrl(
                    fileBuffer,
                    file.mimetype || 'application/pdf',
                  );
                  return {
                    url,
                    name: file.originalFilename || file.newFilename,
                    type: file.mimetype || 'application/pdf',
                    size: file.size,
                  };
                }),
              );
              // Merge with existing files
              customFields[fieldKey] = [...existingField, ...newFieldFiles];
            }
          }
          data.customFields = customFields;
        }

        resolve(data);
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error('Failed to process form data'),
        );
      }
    });
  });
}

/**
 * Helper to read file buffer from formidable file object
 */
async function readFileBuffer(file: formidable.File): Promise<Buffer> {
  const fs = await import('fs/promises');
  return fs.readFile(file.filepath);
}
