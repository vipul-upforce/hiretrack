import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailDialogFooterProps {
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  emailSent: boolean;
  emailError: string;
}

export function EmailDialogFooter({
  onClose,
  onSend,
  sending,
  emailSent,
  emailError,
}: EmailDialogFooterProps) {
  function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
  }

  type SendButtonState = 'sending' | 'sent' | 'error' | 'ready';
  let sendButtonState: SendButtonState = 'ready';
  if (sending) {
    sendButtonState = 'sending';
  } else if (emailSent) {
    sendButtonState = 'sent';
  } else if (emailError) {
    sendButtonState = 'error';
  }

  const sendButtonContent = (() => {
    switch (sendButtonState) {
      case 'sending':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        );
      case 'sent':
        return (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Sent!
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            Retry Send
          </>
        );
      case 'ready':
      default:
        return (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </>
        );
    }
  })();

  return (
    <>
      {/* Success/Error Feedback */}
      {(emailSent || emailError) && (
        <div className="border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          {emailSent && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-sm font-medium">
                Email sent successfully!
              </span>
            </div>
          )}
          {emailError && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">Failed to send email</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {emailError}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-200 bg-background px-6 py-4 dark:border-gray-700">
        <Button variant="outline" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={onSend}
          variant="primary"
          disabled={sending || emailSent}
          className={cn(
            'min-w-[120px]',
            emailSent && 'bg-green-600 hover:bg-green-700',
            emailError && 'bg-red-600 hover:bg-red-700',
          )}
        >
          {sendButtonContent}
        </Button>
      </div>
    </>
  );
}
