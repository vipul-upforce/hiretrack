'use client';

import { FileText, X, Archive, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileWithPreview } from './cv-batch-processor';

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
          className={`flex items-center justify-between p-2 border rounded-lg ${
            file.skipped ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : ''
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {file.skipped ? (
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            ) : file.isZip ? (
              <Archive className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate block">{file.file.name}</span>
              {file.skipReason && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 block truncate">
                  {file.skipReason}
                </span>
              )}
              {!file.skipped && (
                <span className="text-xs text-muted-foreground">
                  {(file.file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>
          {!isProcessing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
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
