"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
}

interface ExistingFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
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

// interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
// }

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function PortalFileUpload({
  onFileSelect,
  accept,
  maxFiles = 1,
  files,
  existingFiles = [],
  id = "",
  setter,
  isEdit = true,
}: FileUploadProps) {

    console.log('files :>> ', files);
  const [renameFile, setRenameFile] = useState<RenameFileState>({
    file: null,
    isExisting: false,
  });
  // const [user, setuser] = useState<User | null>(null);
  // const [droppedFiles, setDroppedFiles] = useState<string[]>();

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          // setuser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  const handleRename = (newName: string) => {
    if (renameFile.file) {
      const newFile = new File([renameFile.file], newName, {
        type: renameFile.file.type,
      });
      const updatedFiles = files.map((f) =>
        f === renameFile.file ? newFile : f
      );
      setter?.(updatedFiles);
      // setDroppedFiles((prev = []) => [...new Set([...prev, newName])]);
    }
  };

  const handleRemoveFile = (fileNameToRemove: string) => {
    const updatedFiles = files.filter(
      (file) => file?.name !== fileNameToRemove
    );
    setter(updatedFiles);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles);
      // setDroppedFiles((prev = []) => [
      //   ...new Set([...prev, ...acceptedFiles.map((file) => file.name)]),
      // ]);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept,
    maxFiles,
  });

  const previewFile: File | ExistingFile | undefined =
    files[0] || existingFiles[0];

  function isExistingFile(file: File | ExistingFile): file is ExistingFile {
    return (file as ExistingFile).url !== undefined;
  }


  return (
    <div className="space-y-4" id={id}>
      <div className="flex justify-center items-center gap-4">
        <Card className="w-16 h-16 flex-shrink-0" {...getRootProps()}>
          <input {...getInputProps()} />
          <CardContent className="p-2 h-full">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-md h-full flex items-center justify-center hover:border-muted-foreground/50 transition-colors cursor-pointer group">
              <Upload className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground/70" />
            </div>
          </CardContent>
        </Card>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 p-2 bg-muted/30 rounded-md border">
            <div className="flex items-center gap-2">
              {previewFile?.type?.startsWith("image/") ? (
                <img
                  src={
                    isExistingFile(previewFile)
                      ? previewFile.url
                      : URL.createObjectURL(previewFile)
                  }
                  alt={previewFile.name}
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  {previewFile?.name?.charAt(0).toUpperCase() || "N"}
                </div>
              )}
              <div className="flex flex-col">
                <p className="text-sm font-medium">
                  {previewFile?.name || "No file uploaded"}
                  {previewFile?.size && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formatFileSize(previewFile.size)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {previewFile?.name && (
              <div className="flex items-center gap-2">
                {/* <button
                  type="button"
                  className="p-2 hover:bg-muted rounded-md"
                  onClick={() =>
                    setRenameFile({
                      file: files[0] || null,
                      isExisting: !files[0],
                      existingFile: existingFiles[0] || undefined,
                    })
                  }
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button> */}
                {files[0] && (
                  <button
                    type="button"
                    className="p-2 hover:bg-muted rounded-md hover:text-red-500"
                    onClick={() => handleRemoveFile(files[0].name)}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
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
