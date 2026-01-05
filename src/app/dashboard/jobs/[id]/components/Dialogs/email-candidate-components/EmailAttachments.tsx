'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Upload, AlertCircle } from 'lucide-react';
import { FileAttachment } from './types';

interface EmailAttachmentsProps {
  attachments: FileAttachment[];
  setAttachments: (attachments: FileAttachment[]) => void;
  sending: boolean;
}

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function EmailAttachments({
  attachments,
  setAttachments,
  sending,
}: EmailAttachmentsProps) {
  const [error, setError] = useState<string>('');

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    e.target.value = '';
    setError('');

    if (files.length === 0) return;

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
      return;
    }

    const newAttachments: FileAttachment[] = [];
    let sizeErrorFound = false;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds the 5MB limit.`);
        sizeErrorFound = true;
        break;
      } else {
        newAttachments.push({
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        });
      }
    }

    // Only update state if no size errors were found and we have valid files
    if (!sizeErrorFound && newAttachments.length > 0) {
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setError('');
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <div className="space-y-2">
      <Label>
        Attachments ({attachments.length}/{MAX_ATTACHMENTS})
      </Label>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="mb-2 space-y-2">
          {attachments.map((att, index) => (
            <div
              key={`${att.fileName}-${att.fileSize}-${att.mimeType}`}
              className="flex items-center justify-between rounded-md border bg-muted/50 p-2"
            >
              <div className="flex flex-1 items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-sm">{att.fileName}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(att.fileSize)})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                disabled={sending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp"
            disabled={attachments.length >= MAX_ATTACHMENTS || sending}
          />
          <label
            htmlFor="file-upload"
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2',
              'hover:bg-accent hover:text-accent-foreground',
              (attachments.length >= MAX_ATTACHMENTS || sending) &&
                'cursor-not-allowed opacity-50',
            )}
          >
            <Upload className="h-4 w-4" />
            Choose Files
          </label>
          <span className="text-xs text-muted-foreground">
            Max 5MB per file
          </span>
        </div>

        {/* Inline Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
