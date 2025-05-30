"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File as FileIcon, Pencil, X } from "lucide-react";
import { RenameFileDialog } from "./rename-file-dialog";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onExistingFilesChange?: (
    files: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }>
  ) => void;
  isEdit?:boolean
  accept: Record<string, string[]>;
  maxFiles?: number;
  files: File[];
  setter: (files: File[]) => void;
  existingFiles?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  id?:string;
}

interface RenameFileState {
  file: File | null;
  isExisting: boolean;
  existingFile?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function FileUpload({
  onFileSelect,
  accept,
  maxFiles = 1,
  files,
  existingFiles = [],
  id='',
  setter,
  isEdit=true
}: FileUploadProps) {
  const [renameFile, setRenameFile] = useState<RenameFileState>({
    file: null,
    isExisting: false,
  });
  const [user, setuser] = useState<User | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<string[]>();
console.log('files :>> ', files);

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setuser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  const handleRename = (newName: string) => {
    if (renameFile.file) {
      if (renameFile.file instanceof File) {
        const newFile = new File([renameFile.file], newName, {
          type: renameFile.file.type,
        });
        const updatedFiles = files.map((f) =>
          f === renameFile.file ? newFile : f
        );
        setter?.(updatedFiles);
      } else {
        // Assuming renameFile.file is an object with a url property
        const updatedFiles = files.map((f) =>
          f === renameFile.file ? { ...f, name: newName } : f
        );
        setter?.(updatedFiles);
      }
      setDroppedFiles((prev = []) => {
        const combined = [...prev, newName];
        return Array.from(new Set(combined));
      });
    }
  };

  const handleRemoveFile = (fileNameToRemove: string) => {
    const updatedFiles = files.filter((file) => file.name !== fileNameToRemove);
    setter(updatedFiles);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles);
      setDroppedFiles((prev = []) => {
        const combined = [...prev, ...acceptedFiles.map((file) => file.name)];
        return Array.from(new Set(combined));
      });
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
  });
  return (
    <div className="space-y-4" id={id}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          ${isDragActive ? "border-primary bg-primary/10" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          {isDragActive
            ? "Drop the files here..."
            : "Drag 'n' drop files here, or click to select files"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {user && user.role === "candidate" && !accept["application/pdf"]
            ? "Maximum 2 files are allowed"
            : null}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {user && user.role === "candidate"
            ? "File should have less than 3MB size"
            : null}
        </p>
      </div>

      <div className="space-y-2 overflow-y-auto" >
        {existingFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div className="flex items-center space-x-2">
              <FileIcon className="h-4 w-4" />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-gray-500">
                ({formatFileSize(file.size)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 hover:bg-muted rounded-md"
                onClick={() =>
                  setRenameFile({
                    file: null,
                    isExisting: true,
                    existingFile: file,
                  })
                }
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}

        {files?.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between p-2 border rounded"
          >
            <div className="flex items-center space-x-2">
              <FileIcon className="h-4 w-4" />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-gray-500">
                ({formatFileSize(file.size)})
              </span>
            </div>
            <div className="flex items-center gap-2">
             {isEdit && <button
                type="button"
                className="p-2 hover:bg-muted rounded-md"
                onClick={() =>
                  setRenameFile({
                    file,
                    isExisting: false,
                  })
                }
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>}
              {droppedFiles?.includes(file.name) && (
                <button
                  type="button"
                  className="p-2 hover:bg-muted rounded-md hover:text-red-500"
                  onClick={() => handleRemoveFile(file.name)}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <RenameFileDialog
        isOpen={!!renameFile.file || !!renameFile.existingFile}
        onClose={() => setRenameFile({ file: null, isExisting: false })}
        fileName={renameFile.file?.name || renameFile.existingFile?.name || ""}
        onRename={handleRename}
      />
    </div>
  );
}
