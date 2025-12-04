import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download, FileText, Mail, Paperclip,
} from 'lucide-react';
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

  return (
    <Dialog open={!!email} onOpenChange={onClose}>
      <DialogContent className="!max-w-none !w-full !h-full !left-0 !top-0 !translate-x-0 !translate-y-0 min-w-0 lg:!max-w-[70vw] lg:!min-w-[800px] lg:!h-[85vh] lg:!left-[50%] lg:!top-[50%] lg:!translate-x-[-50%] lg:!translate-y-[-50%] xl:!max-w-[60vw] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pr-12 border-b border-gray-200 dark:border-gray-700 pb-4">
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
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
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
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  {(email.sentByName || email.sentByEmail || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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
                      to
                      {' '}
                      {email.recipientName || email.recipientEmail}
                    </span>
                    {((email.cc && email.cc.length > 0)
                      || (email.bcc && email.bcc.length > 0)) && (
                      <span className="ml-2">
                        {email.cc && email.cc.length > 0 && (
                          <span>
                            cc:
                            {email.cc.join(', ')}
                          </span>
                        )}
                        {email.bcc && email.bcc.length > 0 && (
                          <span className="ml-2">
                            bcc:
                            {' '}
                            {email.bcc.join(', ')}
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
                {/* Render HTML content or plain text */}
                {email.body ? (
                  email.body.includes('<') && email.body.includes('>') ? (
                    <div
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: email.body }}
                    />
                  ) : (
                    // Plain text - preserve line breaks
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {email.body}
                    </div>
                  )
                ) : (
                  <div className="text-gray-500 italic">No message content</div>
                )}
              </div>

              {/* Attachments in email style */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {email.attachments.length}
                    {' '}
                    attachment
                    {email.attachments.length > 1 ? 's' : ''}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {email.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => window.open(attachment.shareUrl, '_blank')}
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {attachment.fileName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(attachment.fileSize)}
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="flex justify-end gap-3 bg-background px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
