'use client';

import { useCallback } from 'react';
import { type FileRejection, useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  isProcessing: boolean;
  maxPdfPages?: number;
}

export function FileUploader({
  onFilesAdded,
  onFilesRejected,
  isProcessing,
  maxPdfPages = 0,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles);
    },
    [onFilesAdded],
  );

  const onDropRejected = useCallback(
    (rejectedFiles: FileRejection[]) => {
      onFilesRejected?.(rejectedFiles);
    },
    [onFilesRejected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/20'
      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} disabled={isProcessing} />
      <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">Upload Files</h3>
      {isProcessing && (
        <div className="flex flex-row  justify-center items-center">
          <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-progress" />
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {maxPdfPages > 0
          ? `Drop PDF files or a ZIP containing PDFs here, or click to select. Limits: 10MB per PDF, max ${maxPdfPages} pages per PDF.`
          : 'Drop PDF files or a ZIP containing PDFs here, or click to select. Limit: 10MB per PDF.'}
      </p>
    </div>
  );
}
