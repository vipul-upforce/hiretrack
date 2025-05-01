/* eslint-disable no-console */
import { mkdir } from "fs/promises";
import path from "path";
import fs from "fs";

import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from "cloudinary";
import { Settings } from "./mongodb";
// import { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const uploadFile = async (
  base64: string,
  type: "images" | "documents",
  organizationId: string,
  fileName?: string
) => {
  if (!Settings) {
    console.error("Settings Model not found");
    return "";
  }
  const settings = await Settings.findOne({ organizationId });
  if (!settings) {
    console.error("Settings not found");
    return "";
  }
  const fileStorageSettings = settings.fileStorage;
  cloudinary.config({
    cloud_name: fileStorageSettings.cloudinaryCloudName,
    api_key: fileStorageSettings.cloudinaryApiKey,
    api_secret: fileStorageSettings.cloudinaryApiSecret,
  });

  // Extract format from base64 MIME type
  const mimeType = base64.split(";")[0].split(":")[1];
  const format = mimeType.split("/")[1];

  const timestamp = new Date().getTime();

  const uploadOptions: UploadApiOptions = {
    resource_type: "auto" satisfies "auto",
    ...(type === "images" && { format }),
    public_id: fileName || `file_${timestamp}`,
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    use_original_filename: true,
  };

  try {
    const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(
      base64,
      uploadOptions
    );
    return uploadResult?.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    if (typeof error === "object" && error !== null && "message" in error) {
      throw new Error(
        `File upload to Cloudinary failed: ${(error as { message: string }).message}`
      );
    }

    throw new Error("File upload to Cloudinary failed: Unknown error");
  }
};

export const uploadFileToS3 = async (
  base64: string,
  type: "images" | "documents",
  organizationId: string,
  fileName?: string
) => {
  if (!Settings) {
    console.error("Settings Model not found");
    return "";
  }

  const settings = await Settings.findOne({ organizationId });
  if (!settings) {
    console.error("Settings not found");
    return "";
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
    console.error("Missing S3 credentials");
    return "";
  }

  const s3Client = new S3Client({
    region: s3Settings.awsRegion,
    credentials: {
      accessKeyId: s3Settings.awsAccessKeyId,
      secretAccessKey: s3Settings.awsSecretAccessKey,
    },
  });

  // Extract format and data from base64
  const mimeType = base64.split(";")[0].split(":")[1];
  const base64Data = base64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const timestamp = new Date().getTime();
  const finalFileName = fileName || `file_${timestamp}`;

  try {
    const command = new PutObjectCommand({
      Bucket: s3Settings.awsBucketName,
      Key: `${type}/${finalFileName}`,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    });

    await s3Client.send(command);

    // Construct the S3 URL
    return `https://${s3Settings.awsBucketName}.s3.${s3Settings.awsRegion}.amazonaws.com/${type}/${finalFileName}`;
  } catch (error) {
    console.error("S3 upload error:", error);

    let userFriendlyMessage = "File upload failed. Please try again later.";

    if (typeof error === "object" && error !== null) {
      // If it's a standard error with a message
      if ("message" in error) {
        userFriendlyMessage =
          "File upload failed. Please check your AWS API Storage configuration and try again";
      }
    }

    throw new Error(`S3 upload failed: ${userFriendlyMessage}`);
  }
};

export async function saveFileLocally(
  base64: string,
  folder: "documents" | "images",
  fileName: string
) {
  const publicPath = path.join(process.cwd(), "..", "assets");
  await ensureDirectoryExists(publicPath);
  await ensureDirectoryExists(path.join(publicPath, folder));

  const base64Data = base64.replace(/^data:[^;]+;base64,/, "");
  const filePath = path.join("..", "assets", folder, fileName);
  await fs.promises.writeFile(filePath, Buffer.from(base64Data, "base64"));

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
  url: string;
  name: string;
  type: string;
  size: number;
}

async function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

export async function handleFileAttachments(
  newAttachments: Attachments,
  fileStorage: string,
  organizationId: string
  // req: NextRequest
) {
  const updatedAttachments: Attachments = { files: [], images: [] };
  async function processFiles(
    items: FileAttachment[],
    folder: "documents" | "images"
  ) {
    const processedItems: FileAttachment[] = [];
    for (const item of items) {
      if (item.url.startsWith("data:")) {
        let url = "";
        const timestamp = new Date().getTime();
        const uploadName = item.name || `file_${timestamp}`;

        switch (fileStorage) {
          case "cloudinary":
            url = await uploadFile(
              item.url,
              folder,
              organizationId,
              uploadName
            );
            break;
          case "s3":
            url = await uploadFileToS3(
              item.url,
              folder,
              organizationId,
              uploadName
            );
            break;
          default:
            // url = await saveFileLocally(item.url, folder, uploadName, req);
            url = await saveFileLocally(item.url, folder, uploadName);
        }
        processedItems.push({ ...item, url: url || "" });
      } else {
        if (fileStorage === "local") {
          const urlParts = item.url.split("/");
          const originalName = urlParts.pop();
          if (!originalName) {
            console.error("Invalid URL format - cannot extract filename");
            processedItems.push(item);
            continue;
          }

          const newName = item.name || originalName;
          if (originalName !== newName) {
            // Get the file path from the URL
            const publicPath = path.join(process.cwd(), "..", "assets");
            const folder = item.type.startsWith("image/")
              ? "images"
              : "documents";
            const oldPath = path.join(publicPath, folder, originalName);
            const newPath = path.join(publicPath, folder, newName);

            // Rename the file if it exists
            if (fs.existsSync(oldPath)) {
              try {
                await fs.promises.rename(oldPath, newPath);
                // Update the URL with the new filename
                item.url = item.url.replace(originalName, newName);
              } catch (error) {
                console.error("Error renaming file:", error);
              }
            }
          }
        }
        processedItems.push(item);
      }
    }
    return processedItems;
  }

  updatedAttachments.files = await processFiles(
    newAttachments.files || [],
    "documents"
  );
  updatedAttachments.images = await processFiles(
    newAttachments.images || [],
    "images"
  );
  return updatedAttachments;
}

export async function handleCustomFieldFiles(
  customFields: CustomFields,
  fileStorage: string,
  organizationId: string
  // req: NextRequest
) {
  for (const fieldKey in customFields) {
    const field = customFields[fieldKey];
    if (
      Array.isArray(field) &&
      field.length > 0 &&
      typeof field[0] === "object" &&
      field[0] !== null &&
      "base64" in field[0] &&
      "type" in field[0] &&
      "name" in field[0]
    ) {
      const files = field as CustomFieldFile[];
      const processedFiles = [];

      for (const file of files) {
        if (file.base64?.startsWith("data:")) {
          const isImage = file.type.startsWith("image/");
          const folder = isImage ? "images" : "documents";
          let url = "";
          switch (fileStorage) {
            case "cloudinary":
              url = await uploadFile(
                file.base64,
                folder,
                organizationId,
                file.name
              );
              break;
            case "s3":
              url = await uploadFileToS3(
                file.base64,
                folder,
                organizationId,
                file.name
              );
              break;
            default:
              // url = await saveFileLocally(file.base64, folder, file.name, req);
              url = await saveFileLocally(file.base64, folder, file.name);
          }
          processedFiles.push({ ...file, base64: url || "" });
        } else {
          if (fileStorage === "local") {
            const urlParts = file.base64.split("/");
            const originalName = urlParts.pop();
            if (!originalName) {
              console.error("Invalid URL format - cannot extract filename");
              processedFiles.push(file);
              continue;
            }

            const newName = file.name || originalName;
            if (originalName !== newName) {
              // Get the file path from the URL
              const publicPath = path.join(process.cwd(), "..", "assets");
              const folder = file.type.startsWith("image/")
                ? "images"
                : "documents";
              const oldPath = path.join(publicPath, folder, originalName);
              const newPath = path.join(publicPath, folder, newName);

              // Rename the file if it exists
              if (fs.existsSync(oldPath)) {
                try {
                  await fs.promises.rename(oldPath, newPath);
                  // Update the URL with the new filename
                  file.base64 = file.base64.replace(originalName, newName);
                } catch (error) {
                  console.error("Error renaming file:", error);
                }
              }
            }
          }
          processedFiles.push(file);
        }
      }
      customFields[fieldKey] = processedFiles;
    }
  }
  return customFields;
}

export async function handleSingleFile(
  file: SingleFileField | null,
  fileStorage: string,
  organizationId: string
  // req: NextRequest
) {
  if (!file) return null;
  if (file.url?.startsWith("data:")) {
    const isImage = file.type.startsWith("image/");
    const folder = isImage ? "images" : "documents";
    let url = "";
    switch (fileStorage) {
      case "cloudinary":
        url = await uploadFile(file.url, folder, organizationId, file.name);
        break;
      case "s3":
        url = await uploadFileToS3(file.url, folder, organizationId, file.name);
        break;
      default:
        // url = await saveFileLocally(file.url, folder, file.name, req);
        url = await saveFileLocally(file.url, folder, file.name);
    }
    return { ...file, url: url || "" };
  } else {
    if (fileStorage === "local") {
      const urlParts = file.url.split("/");
      const originalName = urlParts.pop();
      if (!originalName) {
        console.error("Invalid URL format - cannot extract filename");
        return;
      }

      const newName = file.name || originalName;
      if (originalName !== newName) {
        // Get the file path from the URL
        const publicPath = path.join(process.cwd(), "..", "assets");
        const folder = file.type.startsWith("image/") ? "images" : "documents";
        const oldPath = path.join(publicPath, folder, originalName);
        const newPath = path.join(publicPath, folder, newName);

        // Rename the file if it exists
        if (fs.existsSync(oldPath)) {
          try {
            await fs.promises.rename(oldPath, newPath);
            // Update the URL with the new filename
            file.url = file.url.replace(originalName, newName);
          } catch (error) {
            console.error("Error renaming file:", error);
          }
        }
      }
    }
  }
  return file;
}
