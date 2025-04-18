"use client";

import type { FileWithPreview } from "./cv-batch-processor";
import { FileText, X, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileListProps {
  files: FileWithPreview[];
  onRemove: (id: string) => void;
  isProcessing?: boolean;
}

export function FileList({
  files,
  onRemove,
  isProcessing = false,
}: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-2 border rounded-lg"
        >
          <div className="flex items-center gap-2">
            {file.isZip ? (
              <Archive className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm truncate">{file.file.name}</span>
          </div>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRemove(file.id)}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
