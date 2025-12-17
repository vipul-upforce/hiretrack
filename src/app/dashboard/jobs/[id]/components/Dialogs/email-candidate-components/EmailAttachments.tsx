import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
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
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }

    const newAttachments: FileAttachment[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
      } else {
        newAttachments.push({
          file,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
        });
      }
    }

    if (newAttachments.length > 0) {
      setAttachments([...attachments, ...newAttachments]);
    }

    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
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

      <div className="flex items-center gap-2">
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp"
          disabled={attachments.length >= MAX_ATTACHMENTS}
        />
        <label
          htmlFor="file-upload"
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2',
            'hover:bg-accent hover:text-accent-foreground',
            attachments.length >= MAX_ATTACHMENTS &&
              'cursor-not-allowed opacity-50',
          )}
        >
          <Upload className="h-4 w-4" />
          Choose Files
        </label>
        <span className="text-xs text-muted-foreground">Max 5MB per file</span>
      </div>
    </div>
  );
}
