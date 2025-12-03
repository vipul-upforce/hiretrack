import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import connectToDatabase, { FileShare } from "./mongodb";
import { uploadFileToProvider } from "./fileUtils";
import { IFileShare } from "./models/fileshare";

// Allowed file extensions for attachments
const ALLOWED_EXTENSIONS = [
  ".pdf", ".zip", ".doc", ".docx", ".xls", ".xlsx", 
  ".ppt", ".pptx", ".txt", ".csv", ".png", ".jpg", 
  ".jpeg", ".gif", ".bmp"
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_ATTACHMENTS = 3;

interface FileShareOptions {
  organizationId: string;
  userId: string;
  file: {
    base64: string;
    fileName: string;
    mimeType: string;
  };
  isPublic?: boolean;
  expiresInHours?: number;
  maxDownloads?: number;
  metadata?: {
    purpose?: string;
    relatedTo?: string;
    relatedId?: string;
  };
  storageConfig: any;
}

interface FileShareResult {
  success: boolean;
  shareId?: string;
  shareUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export function validateFileForUpload(fileName: string, fileSize: number): { valid: boolean; error?: string } {
  // Check file extension
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}` 
    };
  }

  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds limit. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  return { valid: true };
}

export function validateAttachments(files: any[]): { valid: boolean; error?: string } {
  if (files.length > MAX_ATTACHMENTS) {
    return { 
      valid: false, 
      error: `Too many attachments. Maximum allowed: ${MAX_ATTACHMENTS}` 
    };
  }

  for (const file of files) {
    const validation = validateFileForUpload(file.fileName, file.fileSize);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}

export async function createFileShare(options: FileShareOptions): Promise<FileShareResult> {
  try {
    await connectToDatabase();

    const { file, organizationId, userId, isPublic = false, expiresInHours, maxDownloads, metadata, storageConfig } = options;


    // Validate required fields
    if (!organizationId) {
      return { success: false, error: "Organization ID is required" };
    }
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    // Strip data URL prefix if present (e.g., "data:application/pdf;base64,")
    const base64Data = file.base64.includes(',') 
      ? file.base64.split(',')[1] 
      : file.base64;
    
    // Calculate file size from base64
    const fileSize = Buffer.from(base64Data, "base64").length;

    // Validate file
    const validation = validateFileForUpload(file.fileName, fileSize);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique share ID
    const shareId = uuidv4();

    // Calculate expiration date if provided
    const expiresAt = expiresInHours 
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : undefined;

    // Upload file to storage provider
    const uploadResult = await uploadFileToProvider(
      file.base64, // Pass original base64 with prefix for provider functions
      storageConfig,
      organizationId,
      `shares/${shareId}/${file.fileName}`
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // Create file share record with proper ObjectId conversion
    const fileShareData = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      uploadedBy: new mongoose.Types.ObjectId(userId),
      originalFileName: file.fileName,
      storedFileName: uploadResult.fileName,
      fileSize,
      mimeType: file.mimeType,
      storageProvider: storageConfig.storageType,
      storagePath: uploadResult.url,
      shareId,
      isPublic,
      expiresAt,
      maxDownloads,
      currentDownloads: 0,
      downloads: [],
      metadata,
    };

    const fileShare = await FileShare!.create(fileShareData);

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/api/shared-files/${shareId}`;

    return {
      success: true,
      shareId,
      shareUrl,
      fileName: file.fileName,
      fileSize,
    };
  } catch (error: unknown) {
    console.error("Error creating file share:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create file share" };
  }
}

export async function getFileShare(shareId: string) {
  try {
    await connectToDatabase();
    const fileShare = await FileShare!.findOne({ shareId }).select("originalFileName organizationId storagePath storageProvider isPublic  mimeType").lean().exec();
    return fileShare || null;
  } catch (error) {
    console.error("Error getting file share:", error);
    return null;
  }
}

export async function validateAndRecordDownload(
  shareId: string, 
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ valid: boolean; error?: string; fileShare?: IFileShare }> {
  try {
    await connectToDatabase();
    
    const fileShare = await FileShare!.findOne({ shareId });
    if (!fileShare) {
      return { valid: false, error: "File share not found" };
    }

    // Check if share is still valid
    if (!fileShare.isValid()) {
      return { valid: false, error: "File share has expired or reached download limit" };
    }

    // Record the download
    await fileShare.recordDownload(userId, ipAddress, userAgent);

    return { valid: true, fileShare };
  } catch (error) {
    console.error("Error validating download:", error);
    return { valid: false, error: "Failed to validate download" };
  }
}

export async function cleanupExpiredShares(): Promise<void> {
  try {
    await connectToDatabase();
    
    // Find expired shares
    const expiredShares = await FileShare!.find({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { $expr: { $gte: ["$currentDownloads", "$maxDownloads"] } }
      ]
    });

    // Delete files and records
    for (const share of expiredShares) {
      // TODO: Implement file deletion from storage providers
      await share.deleteOne();
    }
  } catch (error) {
    console.error("Error cleaning up expired shares:", error);
  }
}

export function generateShareUrl(shareId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/shared-files/${shareId}`;
}