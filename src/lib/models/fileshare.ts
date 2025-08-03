import mongoose, { Document, Schema } from "mongoose";

export interface IFileShare extends Document {
  organizationId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  mimeType: string;
  storageProvider: string;
  storagePath: string;
  shareId: string;
  isPublic: boolean;
  expiresAt?: Date;
  maxDownloads?: number;
  currentDownloads: number;
  downloads: Array<{
    downloadedAt: Date;
    downloadedBy?: mongoose.Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
  }>;
  metadata?: {
    purpose?: string;
    relatedTo?: string;
    relatedId?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Custom methods
  isValid(): boolean;
  recordDownload(userId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
}

const FileShareSchema = new Schema<IFileShare>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    storageProvider: {
      type: String,
      required: true,
      enum: ["local", "cloudinary", "s3"],
    },
    storagePath: {
      type: String,
      required: true,
    },
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    maxDownloads: {
      type: Number,
    },
    currentDownloads: {
      type: Number,
      default: 0,
    },
    downloads: [{
      downloadedAt: {
        type: Date,
        required: true,
      },
      downloadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      ipAddress: String,
      userAgent: String,
    }],
    metadata: {
      purpose: String,
      relatedTo: String,
      relatedId: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

// Index for cleanup of expired shares
FileShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for organization and share lookups
FileShareSchema.index({ organizationId: 1, shareId: 1 });

// Method to check if share is still valid
FileShareSchema.methods.isValid = function(): boolean {
  // Check if expired
  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }
  
  // Check if download limit reached
  if (this.maxDownloads && this.currentDownloads >= this.maxDownloads) {
    return false;
  }
  
  return true;
};

// Method to record a download
FileShareSchema.methods.recordDownload = async function(userId?: string, ipAddress?: string, userAgent?: string) {
  this.currentDownloads += 1;
  this.downloads.push({
    downloadedAt: new Date(),
    downloadedBy: userId,
    ipAddress,
    userAgent,
  });
  await this.save();
};

const FileShare = mongoose.models.FileShare || mongoose.model<IFileShare>("FileShare", FileShareSchema);

export default FileShareSchema;
export { FileShare };