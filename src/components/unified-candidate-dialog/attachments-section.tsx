import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Paperclip, FileIcon, X } from 'lucide-react';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { Candidate } from '@/types/candidate';
import { handleFileSelect } from '@/app/dashboard/jobs/[id]/hooks/fileUploadUtils';
import { UnifiedFormValues } from './types';

interface AttachmentsSectionProps {
  candidate: Candidate;
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
}

export function AttachmentsSection({
  candidate,
  values,
  setFieldValue,
}: AttachmentsSectionProps) {
  const { sanitizeFiles } = useSanitizeFiles();

  return (
    <div className="space-y-2">
      <Label>Attachments</Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex h-8 items-center gap-2"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.onchange = (e) => {
                const { files } = e.target as HTMLInputElement;
                if (files && files.length > 0) {
                  const sanitizedFiles = sanitizeFiles(Array.from(files));
                  handleFileSelect({
                    files: sanitizedFiles,
                    existingAttachments: candidate.attachments,
                    currentFormAttachments: values.attachments,
                    setFieldValue,
                  });
                }
              };
              input.click();
            }}
          >
            <Paperclip className="h-3 w-3" />
            Add Files
          </Button>
          <span className="text-xs text-muted-foreground">Max 30 files</span>
        </div>

        {values.attachments?.length ? (
          <div className="space-y-1">
            {values.attachments.map((att, index) => (
              <div
                key={`${att.name}-${att.id}-${att.size}`}
                className="flex items-center justify-between rounded border border-gray-200 bg-white p-1.5 text-xs dark:bg-black"
              >
                <div className="flex items-center gap-1">
                  <FileIcon className="h-3 w-3 text-gray-500" />
                  <span className="truncate">{att.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const updated = values.attachments.filter(
                      (_, i) => i !== index,
                    );
                    setFieldValue('attachments', updated);
                  }}
                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
