'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RenameFileDialog } from './rename-file-dialog';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onExistingFilesChange?: (
    files: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }>,
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

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export function PortalFileUpload({
  onFileSelect,
  accept,
  maxFiles = 1,
  files,
  existingFiles = [],
  id = '',
  setter,
}: FileUploadProps) {
  const [renameFile, setRenameFile] = useState<RenameFileState>({
    file: null,
    isExisting: false,
  });

  const handleRename = (newName: string) => {
    if (renameFile.file) {
      const newFile = new File([renameFile.file], newName, {
        type: renameFile.file.type,
      });
      const updatedFiles = files.map((f) =>
        f === renameFile.file ? newFile : f,
      );
      setter?.(updatedFiles);
    }
  };

  const handleRemoveFile = (fileNameToRemove: string) => {
    const updatedFiles = files.filter(
      (file) => file?.name !== fileNameToRemove,
    );
    setter(updatedFiles);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles);
    },
    [onFileSelect],
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
      <div className="flex items-center justify-center gap-4">
        <Card className="h-16 w-16 flex-shrink-0" {...getRootProps()}>
          <input {...getInputProps()} />
          <CardContent className="h-full p-2">
            <div className="group flex h-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-muted-foreground/50">
              <Upload className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground/70" />
            </div>
          </CardContent>
        </Card>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center gap-2">
              {previewFile?.type?.startsWith('image/') ? (
                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src={
                      isExistingFile(previewFile)
                        ? previewFile.url
                        : URL.createObjectURL(previewFile)
                    }
                    alt={previewFile.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                  {previewFile?.name?.charAt(0).toUpperCase() || 'N'}
                </div>
              )}
              <div className="flex flex-col">
                <p className="text-sm font-medium">
                  {previewFile?.name || 'No file uploaded'}
                  {previewFile?.size && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({formatFileSize(previewFile.size)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {previewFile?.name && (
              <div className="flex items-center gap-2">
                {files[0] && (
                  <button
                    type="button"
                    className="rounded-md p-2 hover:bg-muted hover:text-red-500"
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
        fileName={renameFile.file?.name || renameFile.existingFile?.name || ''}
        onRename={handleRename}
      />
    </div>
  );
}
