'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { ExternalLink, Shield, FileText } from 'lucide-react';

interface TermsConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function TermsConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: TermsConfirmationDialogProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleConfirm = () => {
    if (termsAccepted && privacyAccepted) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    onClose();
  };

  const openTerms = () => {
    window.open('/terms-and-conditions.html', '_blank');
  };

  const openPrivacy = () => {
    window.open('/privacy.html', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        size={window.innerWidth < 1024 ? 'sm' : 'md'}
        className="flex flex-col overflow-hidden p-0"
        style={{
          zIndex: 9999,
          marginLeft: window.innerWidth < 1024 ? '0px' : '',
        }}
      >
        <DialogHeader className="px-6 py-4">
          <div className="mb-2 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
              }}
            >
              <Shield
                className="h-5 w-5"
                style={{ color: 'var(--portal-primary, #6366f1)' }}
              />
            </div>
            <DialogTitle>Confirm Application</DialogTitle>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Before submitting your application, please review and accept our
            terms and privacy policy.
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {/* Terms and Conditions */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked as boolean)
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="terms"
                  className="cursor-pointer text-sm leading-relaxed text-gray-700 dark:text-gray-300"
                >
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={openTerms}
                    className="inline-flex items-center gap-1 font-medium underline transition-colors"
                    style={{
                      color: 'var(--portal-primary, #6366f1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color =
                        'var(--portal-primary-hover, #5b5fd6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        'var(--portal-primary, #6366f1)';
                    }}
                  >
                    <FileText className="h-3 w-3" />
                    Terms and Conditions
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </label>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) =>
                  setPrivacyAccepted(checked as boolean)
                }
                className="mt-1"
              />
              <div className="flex-1">
                <label
                  htmlFor="privacy"
                  className="cursor-pointer text-sm leading-relaxed text-gray-700 dark:text-gray-300"
                >
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={openPrivacy}
                    className="inline-flex items-center gap-1 font-medium underline transition-colors"
                    style={{
                      color: 'var(--portal-primary, #6366f1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color =
                        'var(--portal-primary-hover, #5b5fd6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        'var(--portal-primary, #6366f1)';
                    }}
                  >
                    <Shield className="h-3 w-3" />
                    Privacy Policy
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!termsAccepted || !privacyAccepted || isLoading}
            variant="primary"
            className="sm:flex-1"
          >
            {isLoading ? 'Submitting...' : 'Confirm & Submit Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
