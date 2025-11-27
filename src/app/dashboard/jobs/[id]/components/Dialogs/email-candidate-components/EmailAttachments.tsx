import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Upload } from "lucide-react";
import { FileAttachment } from "./types";
import { toast } from "sonner";

interface EmailAttachmentsProps {
  attachments: FileAttachment[];
  setAttachments: (attachments: FileAttachment[]) => void;
  sending: boolean;
}

const MAX_ATTACHMENTS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const EmailAttachments: React.FC<EmailAttachmentsProps> = ({
  attachments,
  setAttachments,
  sending,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
        continue;
      }

      newAttachments.push({
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      });
    }

    if (newAttachments.length > 0) {
      setAttachments([...attachments, ...newAttachments]);
    }

    // Clear the input so the same file can be selected again
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <div className="space-y-2">
      <Label>
        Attachments ({attachments.length}/{MAX_ATTACHMENTS})
      </Label>

      {attachments.length > 0 && (
        <div className="space-y-2 mb-2">
          {attachments.map((att, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-2 flex-1">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{att.fileName}</span>
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
            "inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer",
            "hover:bg-accent hover:text-accent-foreground",
            attachments.length >= MAX_ATTACHMENTS &&
              "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="h-4 w-4" />
          Choose Files
        </label>
        <span className="text-xs text-muted-foreground">Max 5MB per file</span>
      </div>
    </div>
  );
};

