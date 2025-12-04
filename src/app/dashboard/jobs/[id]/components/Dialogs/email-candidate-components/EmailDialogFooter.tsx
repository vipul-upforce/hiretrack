import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2, Mail, CheckCircle, AlertCircle,
} from 'lucide-react';

interface EmailDialogFooterProps {
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  emailSent: boolean;
  emailError: string;
}

export const EmailDialogFooter: React.FC<EmailDialogFooterProps> = ({
  onClose,
  onSend,
  sending,
  emailSent,
  emailError,
}) => {
  function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <>
      {/* Success/Error Feedback */}
      {(emailSent || emailError) && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          {emailSent && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Email sent successfully!
              </span>
            </div>
          )}
          {emailError && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="flex-1">
                <div className="text-sm font-medium">Failed to send email</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {emailError}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 bg-background px-6 py-4 border-t border-gray-200 dark:border-gray-700">
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
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : emailSent ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Sent!
            </>
          ) : emailError ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Retry Send
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </>
  );
};
