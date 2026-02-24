import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Mail, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { EmailHistoryRecord } from '../types';
import { formatFileSize, getStatusBadge, getStatusIcon } from '../utils';

interface EmailDetailsDialogProps {
  email: EmailHistoryRecord | null;
  onClose: () => void;
}

export function EmailDetailsDialog({
  email,
  onClose,
}: EmailDetailsDialogProps) {
  if (!email) return null;

  // Helper function to handle body rendering logic without nested ternaries
  const renderEmailBody = () => {
    // Case 1: No body content
    if (!email.body) {
      return <div className="italic text-gray-500">No message content</div>;
    }

    // Case 2: Body contains HTML tags
    if (email.body.includes('<') && email.body.includes('>')) {
      return (
        <div
          className="leading-relaxed"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      );
    }

    // Case 3: Plain text (default)
    return (
      <div className="whitespace-pre-wrap leading-relaxed">{email.body}</div>
    );
  };

  return (
    <Dialog open={!!email} onOpenChange={onClose}>
      <DialogContent className="!left-0 !top-0 flex !h-full !w-full min-w-0 !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden lg:!left-[50%] lg:!top-[50%] lg:!h-[85vh] lg:!min-w-[800px] lg:!max-w-[70vw] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[60vw]">
        <DialogHeader className="border-b border-gray-200 px-6 pb-4 pr-12 pt-6 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Mail className="h-6 w-6" />
              Email Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusIcon(email.status)}
              {getStatusBadge(email.status)}
            </div>
          </div>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Complete email information and audit trail
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-black">
            {/* Email Header - Like Gmail */}
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="mb-2 text-xl font-medium text-gray-900 dark:text-gray-100">
                    {email.subject || 'No subject'}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip className="h-4 w-4" />
                    )}
                    <span>
                      {format(
                        new Date(email.createdAt),
                        'MMM dd, yyyy, h:mm a',
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-medium text-white">
                  {(email.sentByName || email.sentByEmail || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {email.sentByName || 'Unknown'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      &lt;
                      {email.sentByEmail}
                      &gt;
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      to {email.recipientName || email.recipientEmail}
                    </span>
                    {((email.cc && email.cc.length > 0) ||
                      (email.bcc && email.bcc.length > 0)) && (
                      <span className="ml-2">
                        {email.cc && email.cc.length > 0 && (
                          <span>
                            cc:
                            {email.cc.join(', ')}
                          </span>
                        )}
                        {email.bcc && email.bcc.length > 0 && (
                          <span className="ml-2">
                            bcc: {email.bcc.join(', ')}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="px-6 py-6">
              <div className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100">
                {renderEmailBody()}
              </div>

              {/* Attachments in email style */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    {email.attachments.length} attachment
                    {email.attachments.length > 1 ? 's' : ''}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {email.attachments.map((attachment) => (
                      <button
                        type="button"
                        key={attachment.fileName}
                        className="flex w-full text-left cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        onClick={() =>
                          window.open(attachment.shareUrl, '_blank')
                        }
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {attachment.fileName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(attachment.fileSize)}
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-background px-6 py-4 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
