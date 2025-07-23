"use client";

import { useEffect, useState, useRef } from "react";
import { File as FileIcon, Pencil, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RenameFileDialog } from "./rename-file-dialog";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

interface MobileFileUploadProps {
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
  isEdit?: boolean;
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
  id?: string;
  buttonText?: string;
  showFileLimit?: boolean;
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

export function MobileFileUpload({
  onFileSelect,
  accept,
  maxFiles = 1,
  files,
  existingFiles = [],
  id = "",
  setter,
  isEdit = true,
  buttonText = "Add Files",
  showFileLimit = true,
}: MobileFileUploadProps) {
  const [renameFile, setRenameFile] = useState<RenameFileState>({
    file: null,
    isExisting: false,
  });
  const [user, setUser] = useState<User | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
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
      setDroppedFiles((prev) => {
        const combined = [...prev, newName];
        return Array.from(new Set(combined));
      });
    }
  };

  const handleRemoveFile = (fileNameToRemove: string) => {
    const updatedFiles = files.filter(
      (file) => file?.name !== fileNameToRemove
    );
    setter(updatedFiles);
    setDroppedFiles((prev) => prev.filter((name) => name !== fileNameToRemove));
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      onFileSelect(selectedFiles);
      setDroppedFiles((prev) => {
        const combined = [...prev, ...selectedFiles.map((file) => file?.name)];
        return Array.from(new Set(combined));
      });
    }
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Convert accept object to string format for input element
  const acceptString = Object.entries(accept)
    .flatMap(([mimeType, extensions]) => [mimeType, ...extensions])
    .join(",");

  const totalFiles = files.length + existingFiles.length;
  const canAddMore = totalFiles < maxFiles;

  return (
    <div className="space-y-4" id={id}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        multiple={maxFiles > 1}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Add Files Button */}
      <div className="flex flex-col space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2 py-3"
          onClick={handleButtonClick}
          disabled={!canAddMore}
        >
          <Plus className="h-4 w-4" />
          {buttonText}
        </Button>

        {/* File limit and size information */}
        {showFileLimit && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            {user && user.role === "candidate" && maxFiles > 1 && (
              <p>
                Maximum {maxFiles} files allowed ({totalFiles}/{maxFiles})
              </p>
            )}
            {user && user.role === "candidate" && (
              <p>File size limit: 3MB per file</p>
            )}
            {user &&
              ["hr", "admin", "interviewer"].includes(user.role || "") && (
                <p>File size limit: 50MB per file</p>
              )}
          </div>
        )}
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {/* Existing Files */}
        {existingFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-muted"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file?.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                className="p-2 hover:bg-muted-foreground/10 rounded-md transition-colors"
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

        {/* New Files */}
        {files?.map((file) => (
          <div
            key={file?.name}
            className="flex items-center justify-between p-3 border rounded-lg bg-primary/10"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <FileIcon className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file?.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {isEdit && (
                <button
                  type="button"
                  className="p-2 hover:bg-primary/20 rounded-md transition-colors"
                  onClick={() =>
                    setRenameFile({
                      file,
                      isExisting: false,
                    })
                  }
                >
                  <Pencil className="h-4 w-4 text-primary" />
                </button>
              )}
              {droppedFiles?.includes(file?.name) && (
                <button
                  type="button"
                  className="p-2 hover:bg-destructive/20 rounded-md transition-colors"
                  onClick={() => handleRemoveFile(file?.name)}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {files.length === 0 && existingFiles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">No files selected</p>
          </div>
        )}
      </div>

      {/* Rename Dialog */}
      <RenameFileDialog
        isOpen={!!renameFile.file || !!renameFile.existingFile}
        onClose={() => setRenameFile({ file: null, isExisting: false })}
        fileName={renameFile.file?.name || renameFile.existingFile?.name || ""}
        onRename={handleRename}
      />
    </div>
  );
}
