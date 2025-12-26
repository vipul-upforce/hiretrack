import mongoose from 'mongoose';

import path from 'path';
import fs, { existsSync, promises } from 'fs';

import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from 'cloudinary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { FileStorageValues } from '@/app/dashboard/settings/components/file-storage/schema';
import { Settings, FileUrlMapping } from './mongodb';
import logger from './logger';
// import { NextRequest } from "next/server";

export const uploadFile = async (
  base64: string,
  type: 'images' | 'documents' | 'organizations' | string,
  organizationId: string,
  fileName?: string,
) => {
  if (!Settings) {
    return '';
  }
  const settings = await Settings.findOne({ organizationId });
  if (!settings) {
    return '';
  }
  const fileStorageSettings = settings.fileStorage;
  cloudinary.config({
    cloud_name: fileStorageSettings.cloudinaryCloudName,
    api_key: fileStorageSettings.cloudinaryApiKey,
    api_secret: fileStorageSettings.cloudinaryApiSecret,
  });

  // Extract format from base64 MIME type
  const mimeType = base64.split(';')[0].split(':')[1];
  const format = mimeType.split('/')[1];

  const timestamp = new Date().getTime();

  const uploadOptions: UploadApiOptions = {
    resource_type: 'auto' satisfies 'auto',
    ...(type === 'images' && { format }),
    public_id: fileName || `file_${timestamp}`,
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    use_original_filename: true,
  };

  try {
    const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(
      base64,
      uploadOptions,
    );
    return uploadResult?.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    if (typeof error === 'object' && error !== null && 'message' in error) {
      throw new Error(
        `File upload to Cloudinary failed: ${(error as { message: string }).message}`,
      );
    }

    throw new Error('File upload to Cloudinary failed: Unknown error');
  }
};

export const uploadFileToS3 = async (
  base64: string,
  type: 'images' | 'documents' | 'organizations' | string,
  organizationId: string,
  fileName?: string,
) => {
  if (!Settings) {
    return '';
  }

  const settings = await Settings.findOne({ organizationId });
  if (!settings) {
    return '';
  }

  const s3Settings = settings.fileStorage as {
    awsRegion: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsBucketName: string;
    storageType: string;
  };

  if (
    !s3Settings.awsRegion ||
    !s3Settings.awsAccessKeyId ||
    !s3Settings.awsSecretAccessKey
  ) {
    return '';
  }

  const s3Client = new S3Client({
    region: s3Settings.awsRegion,
    credentials: {
      accessKeyId: s3Settings.awsAccessKeyId,
      secretAccessKey: s3Settings.awsSecretAccessKey,
    },
  });

  // Extract format and data from base64
  const mimeType = base64.split(';')[0].split(':')[1];
  const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const timestamp = new Date().getTime();
  const finalFileName = fileName || `file_${timestamp}`;

  try {
    const command = new PutObjectCommand({
      Bucket: s3Settings.awsBucketName,
      Key: `${type}/${finalFileName}`,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    return `https://${s3Settings.awsBucketName}.s3.${s3Settings.awsRegion}.amazonaws.com/${type}/${finalFileName}`;
  } catch (error) {
    let userFriendlyMessage = 'File upload failed. Please try again later.';

    if (typeof error === 'object' && error !== null) {
      // If it's a standard error with a message
      if ('message' in error) {
        userFriendlyMessage =
          'File upload failed. Please check your AWS API Storage configuration and try again';
      }
    }

    throw new Error(`S3 upload failed: ${userFriendlyMessage}`);
  }
};

async function ensureDirectoryExists(dirPath: string) {
  if (!existsSync(dirPath)) {
    await promises.mkdir(dirPath, { recursive: true });
  }
}

export async function saveFileLocally(
  base64: string,
  folder: 'documents' | 'images' | 'organizations' | string,
  fileName: string,
) {
  const publicPath = path.join(process.cwd(), '..', 'assets');
  await ensureDirectoryExists(publicPath);
  await ensureDirectoryExists(path.join(publicPath, folder));

  const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
  let filePath = path.join('..', 'assets', folder, fileName);

  // Check for existing file and make the name unique if needed
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let uniqueFileName = fileName;
  let counter = 1;
  let uniqueFilePath = filePath;
  while (fs.existsSync(uniqueFilePath)) {
    uniqueFileName = `${base}_${counter}${ext}`;
    uniqueFilePath = path.join('..', 'assets', folder, uniqueFileName);
    counter += 1;
  }
  filePath = uniqueFilePath;

  await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));

  return `/api/files?pathName=${filePath}`;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Attachments {
  files: FileAttachment[];
  images: FileAttachment[];
}

export interface CustomFieldFile {
  id: string;
  base64: string;
  name: string;
  type: string;
  size: number;
}

export interface CustomFields {
  [key: string]:
    | string
    | string[]
    | CustomFieldFile[]
    | {
        type: string;
        value: string | number | boolean | null;
        required?: boolean;
      }
    | object;
}

export interface SingleFileField {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
}

export async function handleFileAttachments(
  newAttachments: Attachments,
  fileStorage: string,
  organizationId: string,
) {
  const updatedAttachments: Attachments = { files: [], images: [] };
  async function processFiles(
    items: FileAttachment[],
    folder: 'documents' | 'images',
  ) {
    const processedItems: FileAttachment[] = [];
    for (const item of items) {
      if (item.url.startsWith('data:')) {
        let realUrl = '';
        const timestamp = new Date().getTime();
        const uploadName = item.name || `file_${timestamp}`;

        switch (fileStorage) {
          case 'cloudinary':
            realUrl = await uploadFile(
              item.url,
              folder,
              organizationId,
              uploadName,
            );
            break;
          case 's3':
            realUrl = await uploadFileToS3(
              item.url,
              folder,
              organizationId,
              uploadName,
            );
            break;
          default: {
            const localUrl = await saveFileLocally(
              item.url,
              folder,
              uploadName,
            );
            processedItems.push({ ...item, url: localUrl });
            // eslint-disable-next-line no-continue
            continue; // Skip the rest for local files
          }
        }

        if (realUrl && FileUrlMapping) {
          await FileUrlMapping.create({
            fileId: item.id || new mongoose.Types.ObjectId().toHexString(),
            realUrl,
          });
          const proxiedUrl = `/api/file/${item.id}`;
          processedItems.push({ ...item, url: proxiedUrl });
        } else {
          // Handle upload failure
          processedItems.push({ ...item, url: '' });
        }
      } else {
        processedItems.push(item);
      }
    }
    return processedItems;
  }

  updatedAttachments.files = await processFiles(
    newAttachments.files || [],
    'documents',
  );
  updatedAttachments.images = await processFiles(
    newAttachments.images || [],
    'images',
  );
  return updatedAttachments;
}

export async function handleCustomFieldFiles(
  customFields: CustomFields,
  fileStorage: string,
  organizationId: string,
) {
  for (const fieldKey in customFields) {
    if (Object.prototype.hasOwnProperty.call(customFields, fieldKey)) {
      const field = customFields[fieldKey];
      if (
        Array.isArray(field) &&
        field.length > 0 &&
        typeof field[0] === 'object' &&
        field[0] !== null &&
        'base64' in field[0] &&
        'type' in field[0] &&
        'name' in field[0]
      ) {
        const files = field as CustomFieldFile[];
        const processedFiles = [];

        for (const file of files) {
          if (file.base64?.startsWith('data:')) {
            const isImage = file.type.startsWith('image/');
            const folder = isImage ? 'images' : 'documents';
            let realUrl = '';

            switch (fileStorage) {
              case 'cloudinary':
                realUrl = await uploadFile(
                  file.base64,
                  folder,
                  organizationId,
                  file.name,
                );
                break;
              case 's3':
                realUrl = await uploadFileToS3(
                  file.base64,
                  folder,
                  organizationId,
                  file.name,
                );
                break;
              default: {
                const localUrl = await saveFileLocally(
                  file.base64,
                  folder,
                  file.name,
                );
                processedFiles.push({ ...file, base64: localUrl });
                // eslint-disable-next-line no-continue
                continue; // Skip the rest for local files
              }
            }

            if (realUrl && FileUrlMapping) {
              const fileId =
                file.id || new mongoose.Types.ObjectId().toHexString();
              await FileUrlMapping.create({ fileId, realUrl });
              const proxiedUrl = `/api/file/${fileId}`;
              processedFiles.push({ ...file, base64: proxiedUrl, id: fileId });
            } else {
              processedFiles.push({ ...file, base64: '' });
            }
          } else {
            processedFiles.push(file);
          }
        }
        // eslint-disable-next-line no-param-reassign
        customFields[fieldKey] = processedFiles;
      }
    }
  }
  return customFields;
}

export async function handleSingleFile(
  file: SingleFileField | null,
  fileStorage: string,
  organizationId: string,
  orgName?: string,
) {
  if (!file) return null;
  if (file.url?.startsWith('data:')) {
    const isImage = file.type.startsWith('image/');
    const isHtml = file.type === 'text/html';
    let folder: string;
    if (isImage) {
      folder = 'images';
    } else if (isHtml) {
      folder = `organizations/${orgName}`;
    } else {
      folder = 'documents';
    }
    let realUrl = '';

    switch (fileStorage) {
      case 'cloudinary':
        realUrl = await uploadFile(file.url, folder, organizationId, file.name);
        break;
      case 's3':
        realUrl = await uploadFileToS3(
          file.url,
          folder,
          organizationId,
          file.name,
        );
        break;
      default: {
        const localUrl = await saveFileLocally(file.url, folder, file.name);
        return { ...file, url: localUrl };
      }
    }

    if (realUrl && FileUrlMapping) {
      const fileId = file.id || new mongoose.Types.ObjectId().toHexString();
      await FileUrlMapping.create({ fileId, realUrl });
      const proxiedUrl = `/api/file/${fileId}`;
      return { ...file, url: proxiedUrl, id: fileId };
    }
    return { ...file, url: '' };
  }
  return file;
}

// Helper function for file sharing module
export async function uploadFileToProvider(
  base64: string,
  fileStorage: FileStorageValues,
  organizationId: string,
  filePath: string,
): Promise<{
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const fileName = path.basename(filePath);
    const folder = path.dirname(filePath);

    let url = '';
    switch (fileStorage.storageType) {
      case 'cloudinary':
        url = await uploadFile(base64, folder, organizationId, fileName);
        break;
      case 's3':
        url = await uploadFileToS3(base64, folder, organizationId, fileName);
        break;
      default: // local storage
        // For local storage, save the file and return the relative path (not URL)
        await saveFileLocally(base64, folder, fileName);
        // Return the relative path that getFileFromProvider expects
        url = path.join(folder, fileName);
        break;
    }

    if (!url) {
      return { success: false, error: 'Failed to upload file' };
    }

    return { success: true, url, fileName };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// Helper function to get file from provider
export async function getFileFromProvider(
  filePath: string,
  fileStorage: FileStorageValues,
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  try {
    switch (fileStorage.storageType) {
      case 'local': {
        // For local files, read from the file system
        const publicPath = path.join(process.cwd(), '..', 'assets');
        const fullPath = path.join(publicPath, filePath);

        if (!fs.existsSync(fullPath)) {
          return { success: false, error: 'File not found' };
        }

        const buffer = await fs.promises.readFile(fullPath);
        return { success: true, buffer };
      }

      case 'cloudinary': {
        // For Cloudinary, fetch the file from URL
        const response = await fetch(filePath);
        if (!response.ok) {
          return {
            success: false,
            error: 'Failed to fetch file from Cloudinary',
          };
        }
        const arrayBuffer = await response.arrayBuffer();
        return { success: true, buffer: Buffer.from(arrayBuffer) };
      }

      case 's3': {
        // For S3, use AWS SDK to get the file
        // This would need to be implemented based on your S3 setup
        // For now, we'll fetch from the URL
        const s3Response = await fetch(filePath);
        if (!s3Response.ok) {
          return { success: false, error: 'Failed to fetch file from S3' };
        }
        const s3ArrayBuffer = await s3Response.arrayBuffer();
        return { success: true, buffer: Buffer.from(s3ArrayBuffer) };
      }

      default:
        return { success: false, error: 'Unknown storage provider' };
    }
  } catch (error: unknown) {
    logger.error('Error getting file from provider:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file',
    };
  }
}
