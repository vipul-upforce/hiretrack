"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
  isProcessing: boolean;
}

export function FileUploader({
  onFilesAdded,
  isProcessing,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/zip": [".zip"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/20"
      } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} disabled={isProcessing} />
      <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">Upload Files</h3>
      {isProcessing && (
        <p className="text-red-600">Uploads are currently restricted.</p>
      )}
      <p className="text-sm text-muted-foreground">
        Drop PDF files or a ZIP containing PDFs here, or click to select
      </p>
    </div>
  );
}
