"use client";

import type { FileWithPreview } from "./cv-batch-processor";
import { FileText, X } from "lucide-react";
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
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Files ({files.length})</h3>
        </div>
      </div>
      <ul className="divide-y">
        {files.map((file) => (
          <li key={file.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium truncate max-w-[300px]">
                  {file.file.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(file.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(file.id)}
              disabled={isProcessing}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
