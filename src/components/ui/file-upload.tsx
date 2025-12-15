'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, File as FileIcon, Pencil, X, Paperclip,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RenameFileDialog } from './rename-file-dialog';
import { Button } from './button';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  colorScheme?: 'blue' | 'green';
  isResume?: boolean;
  dropZone?: boolean;
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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export function FileUpload({
  onFileSelect,
  dropZone = false,
  accept,
  maxFiles = 1,
  files,
  existingFiles = [],
  id = '',
  setter,
  isEdit = true,
  colorScheme = 'blue', // Default to blue
  isResume = false, // Default to false
}: FileUploadProps) {
  const [renameFile, setRenameFile] = useState<RenameFileState>({
    file: null,
    isExisting: false,
  });
  const getColorClasses = (scheme: 'blue' | 'green') => {
    switch (scheme) {
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          text: 'text-green-700 dark:text-green-300',
          hoverBg: 'hover:bg-green-100 dark:hover:bg-green-800/50',
        };
      case 'blue':
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-700 dark:text-blue-300',
          hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-800/50',
        };
    }
  };

  const colors = getColorClasses(colorScheme);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {},
  );

  const handleRename = (newName: string) => {
    if (renameFile.file) {
      if (renameFile.file instanceof File) {
        const newFile = new File([renameFile.file], newName, {
          type: renameFile.file.type,
        });
        const updatedFiles = files.map((f) => (f === renameFile.file ? newFile : f));
        setter?.(updatedFiles);
      } else {
        const updatedFiles = files.map((f) => (f === renameFile.file ? { ...f, name: newName } : f));
        setter?.(updatedFiles);
      }
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

  const {
    getRootProps, getInputProps, isDragActive, open,
  } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div className="space-y-4" id={id}>
      {/* Always render the hidden input for both modes */}
      <input {...getInputProps()} id="file-upload-input" className="hidden" />

      {dropZone ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {isDragActive
              ? 'Drop the files here...'
              : "Drag 'n' drop files here, or click to select files"}
          </p>
          {(user?.role === 'candidate' || user?.role === '') && (
            <>
              {!accept['application/pdf'] && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Maximum 2 files are allowed
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                File should have less than 3MB size
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 ">
          <Button
            type="button"
            onClick={open}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Paperclip className="w-4 h-4" />
            {isResume ? 'Resume' : 'Add Documents'}
          </Button>
          {(user?.role === 'candidate' || user?.role === '') && (
            <div className="space-y-1 flex items-center gap-2">
              {!accept['application/pdf'] && (
                <p className="text-sm text-muted-foreground mt-1">
                  Max 2 files
                </p>
              )}
              <p className="text-sm text-muted-foreground m-0">3MB per file</p>
            </div>
          )}
          {/* {user && ["hr", "admin", "interviewer"].includes(user.role) && (
            <p className="text-sm text-muted-foreground">
              100MB per file            </p>
          )} */}
        </div>
      )}

      {/* File Previews */}
      <div className="space-y-2 overflow-y-auto">
        {existingFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-2 border rounded break-all"
          >
            <div className="flex items-center space-x-2">
              <FileIcon className="h-4 w-4" />
              <span className="text-sm break-words max-w-[350px]">
                {file.name}
              </span>
              <span className="text-xs text-gray-500">
                (
                {formatFileSize(file.size)}
                )
              </span>
              <button
                type="button"
                className="p-2 hover:bg-muted rounded-md hover:text-red-500"
                onClick={() => handleRemoveFile(file.name)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <button
              type="button"
              className="p-2 hover:bg-muted rounded-md"
              onClick={() => setRenameFile({
                file: null,
                isExisting: true,
                existingFile: file,
              })}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ))}

        {files.map((file) => (
          <div
            key={file.name}
            className={`flex items-center justify-between p-3 ${colors.bg} ${colors.border} rounded-lg`}
          >
            <div className="flex items-center gap-2">
              <FileIcon className={`w-4 h-4 ${colors.icon}`} />
              <span className={`text-sm font-medium ${colors.text}`}>
                {file.name}
              </span>
              <span className={`text-xs ${colors.icon}`}>
                (
                {formatFileSize(file.size)}
                )
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isEdit && (
                <button
                  type="button"
                  className={`p-2 ${colors.hoverBg} rounded-md text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300`}
                  onClick={() => setRenameFile({
                    file,
                    isExisting: false,
                  })}
                >
                  <Pencil className="h-4 " />
                </button>
              )}
              <button
                type="button"
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => handleRemoveFile(file.name)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
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
