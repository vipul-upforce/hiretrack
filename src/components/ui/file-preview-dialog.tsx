'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { File, Download, X } from 'lucide-react';
import { Button } from './button';

interface FilePreviewDialogProps {
  file: File | null
  preview: string | null
  isOpen: boolean
  onClose: () => void
}

export function FilePreviewDialog({
  file,
  preview,
  isOpen,
  onClose,
}: FilePreviewDialogProps) {
  if (!file || !preview) return null;

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = preview;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreview = () => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center min-h-full p-4">
          <img
            src={preview}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <div className="w-full h-full">
          <iframe
            src={preview}
            className="w-full h-full"
            title={file.name}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-4 min-h-full">
        <File className="h-16 w-16" />
        <p>Preview not available for this file type</p>
        <Button variant="secondary" onClick={downloadFile}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 flex flex-row items-start justify-between space-y-0 border-b shrink-0">
          <div className="flex-1">
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              <File className="h-4 w-4" />
              <span className="truncate">{file.name}</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              {Math.round(file.size / 1024)}
              KB -
              {file.type || 'Unknown type'}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={downloadFile}
              title="Download file"
              className="h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
