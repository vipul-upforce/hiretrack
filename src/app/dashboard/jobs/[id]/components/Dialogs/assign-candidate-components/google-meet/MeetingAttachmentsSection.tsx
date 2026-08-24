import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Paperclip, FileIcon, X } from 'lucide-react';
import type { Attachment } from '../../../../schemas/AssignCandidateSchema';

interface MeetingAttachmentsSectionProps {
  meetingAttachments: Attachment[] | undefined;
  onAttachmentsChange: (files: Attachment[]) => void;
  sanitizeFiles: (files: File[]) => File[];
}

const MAX_ATTACHMENTS = 10;

/**
 * Meeting attachments field: add files and remove from list.
 */
export function MeetingAttachmentsSection({
  meetingAttachments,
  onAttachmentsChange,
  sanitizeFiles,
}: MeetingAttachmentsSectionProps) {
  const currentFiles = Array.isArray(meetingAttachments) ? meetingAttachments : [];

  const handleAddFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const { files } = e.target as HTMLInputElement;
      if (files && files.length > 0) {
        const availableSlots = Math.max(0, MAX_ATTACHMENTS - currentFiles.length);
        const sanitizedNewFiles = sanitizeFiles(Array.from(files));
        const updatedFiles = [
          ...currentFiles,
          ...sanitizedNewFiles.slice(0, availableSlots),
        ] as Attachment[];
        onAttachmentsChange(updatedFiles);
      }
    };
    input.click();
  };

  const handleRemove = (index: number) => {
    const updatedFiles = currentFiles.filter((_, i) => i !== index);
    onAttachmentsChange(updatedFiles);
  };

  return (
    <div className="space-y-1">
      <Label className="text-sm">Meeting Attachments (Optional)</Label>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex h-8 items-center gap-2"
          onClick={handleAddFiles}
        >
          <Paperclip className="h-3 w-3" />
          Add Files
        </Button>

        {currentFiles.length > 0 && (
          <ul className="space-y-2">
            {currentFiles.map((file, index) => (
              <li
                key={
                  'id' in file && file.id
                    ? String(file.id)
                    : `${file.name}-${file.size ?? 0}`
                }
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                  <span
                    className="max-w-[200px] truncate text-sm text-gray-900 dark:text-gray-100"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  {file.size != null && file.size > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
