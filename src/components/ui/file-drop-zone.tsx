"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Cloud, Pencil, X } from "lucide-react";
import { FilePreviewDialog } from "./file-preview-dialog";
import { RenameFileDialog } from "./rename-file-dialog";
import { v4 as uuidv4 } from "uuid";

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface FileDropZoneProps {
  value: File[] | FileData[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  existingFiles?: Array<{
    name: string;
    type: string;
    size: number;
    preview: string;
  }>;
}

export const FileDropZone = ({
  value,
  onFilesChange,
  maxFiles = 30,
  maxSize = 30 * 1024 * 1024,
  existingFiles = [],
}: FileDropZoneProps) => {
  const [previews, setPreviews] = React.useState<{ [key: string]: string }>({});
  const [previewFile, setPreviewFile] = React.useState<File | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [renameFile, setRenameFile] = React.useState<File | null>(null);
  const [droppedFiles, setDroppedFiles] = React.useState<string[]>([]);

  const convertToFile = async (fileData: FileData): Promise<File> => {
    const response = await fetch(fileData.base64);
    const blob = await response.blob();
    return new File([blob], fileData.name, {
      type: fileData.type,
      lastModified: Date.now(),
    });
  };

  React.useEffect(() => {
    const initializeFiles = async () => {
      const convertedFiles = await Promise.all(
        (value || []).map(async (item) => {
          if ("base64" in item) {
            return await convertToFile(item);
          }
          return item;
        })
      );
      setFiles(convertedFiles);
    };
    initializeFiles();
  }, [value]);

  React.useEffect(() => {
    if (existingFiles?.length > 0) {
      const existingPreviews = existingFiles.reduce(
        (acc, file) => ({
          ...acc,
          [file.name]: file.preview,
        }),
        {}
      );

      setPreviews((prev) => ({
        ...prev,
        ...existingPreviews,
      }));
    }
  }, [existingFiles]);

  const generatePreviews = React.useCallback(async (newFiles: File[]) => {
    const newPreviews: { [key: string]: string } = {};

    for (const file of newFiles) {
      try {
        const base64 = await fileToBase64(file);
        newPreviews[file.name] = base64;
      } catch (error) {}
    }

    setPreviews((prev) => ({
      ...prev,
      ...newPreviews,
    }));
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  React.useEffect(() => {
    if (files.length > 0) {
      generatePreviews(files);
    }

    return () => {
      Object.values(previews).forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [files, generatePreviews]);

  const handleRemoveFile = (fileNameToRemove: string) => {
    const updatedFiles = files.filter((file) => file.name !== fileNameToRemove);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setDroppedFiles((prev) => prev.filter((name) => name !== fileNameToRemove));
  };

  const isFileNameDuplicate = (fileName: string): boolean => {
    return (
      existingFiles.some((file) => file.name === fileName) ||
      files.some((file) => file.name === fileName)
    );
  };

  const generateUniqueFileName = (file: File): string => {
    if (!isFileNameDuplicate(file.name)) {
      return file.name;
    }

    const fileExtension = file.name.split(".").pop() || "";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return `${baseName}_${uuidv4()}.${fileExtension}`;
  };

  const renameFileWithUUID = async (
    file: File,
    newFileName: string
  ): Promise<File> => {
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    setDroppedFiles((prev = []) => {
      const combined = [...prev, newFileName];
      return Array.from(new Set(combined));
    });

    return new File([blob], newFileName, {
      type: file.type,
      lastModified: file.lastModified,
    });
  };

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const processedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const uniqueFileName = generateUniqueFileName(file);
          if (uniqueFileName === file.name) {
            return file;
          }
          return await renameFileWithUUID(file, uniqueFileName);
        })
      );

      const newFiles = [...files, ...processedFiles];
      setFiles(newFiles);
      onFilesChange(newFiles);
      setDroppedFiles((prev) => {
        const newFileNames = processedFiles.map((file) => file.name);
        return Array.from(new Set([...prev, ...newFileNames]));
      });
    },
    [files, onFilesChange, existingFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - files.length,
    maxSize,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
      "text/plain": [".txt"],
    },
  });

  const openPreview = (file: File) => {
    const preview = previews[file.name];
    if (preview) {
      setPreviewFile(file);
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameFile) return;

    const fileIndex = files.findIndex((f) => f === renameFile);
    if (fileIndex === -1) return;

    const newFile = await renameFileWithUUID(renameFile, newName);

    const updatedFiles = [...files];
    updatedFiles[fileIndex] = newFile;

    const newPreviews = { ...previews };
    newPreviews[newName] = newPreviews[renameFile.name];
    delete newPreviews[renameFile.name];
    setPreviews(newPreviews);

    if (droppedFiles.includes(renameFile.name)) {
      setDroppedFiles((prev) => {
        const updatedDroppedFiles = prev.filter(
          (name) => name !== renameFile.name
        );
        updatedDroppedFiles.push(newName);
        return updatedDroppedFiles;
      });
    }
    setDroppedFiles((prev) => {
      return Array.from(new Set([...prev, newName]));
    });
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className="space-y-4 p-0">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-muted"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Cloud className="h-10 w-10 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>
                Drag & drop files here, or click to select files
                <br />
                <span className="text-xs">
                  (Max {maxFiles} files, up to{" "}
                  {Math.round(maxSize / 1024 / 1024)}MB each)
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  Accepted files: Images (PNG, JPG, GIF), PDF, ZIP, Documents
                  (DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <FilePreviewDialog
        file={previewFile}
        preview={previewFile ? previews[previewFile.name] : null}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {files.length > 0 && (
        <div className="mb-2 w-full overflow-clip">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center w-full mb-2 gap-2 rounded-md border p-2 hover:bg-muted/50 transition-colors group"
            >
              <div
                className="cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => openPreview(file)}
              >
                {/* <PreviewComponent file={file} /> */}
              </div>
              <div
                className="flex-1 min-w-0 text-sm cursor-pointer"
                onClick={() => openPreview(file)}
              >
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {Math.round(file.size / 1024)}KB -{" "}
                  {file.type || "Unknown type"}
                </p>
              </div>

              <button
                type="button"
                className="p-2 hover:bg-muted rounded-md"
                onClick={() => setRenameFile(file)}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              {/* {droppedFiles.includes(file.name) && ( */}
              <button
                type="button"
                className="p-2 hover:bg-muted rounded-md hover:text-red-500"
                onClick={() => handleRemoveFile(file.name)}
                aria-label="Remove file"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              {/* )} */}
            </div>
          ))}
        </div>
      )}

      <RenameFileDialog
        isOpen={!!renameFile}
        onClose={() => setRenameFile(null)}
        fileName={renameFile?.name || ""}
        onRename={handleRename}
      />
    </div>
  );
};
