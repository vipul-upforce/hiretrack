"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { ExternalLink, Shield, FileText } from "lucide-react";

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
    window.open("/terms-and-conditions.html", "_blank");
  };

  const openPrivacy = () => {
    window.open("/privacy.html", "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent size="md" className="p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle>
              Confirm Application
            </DialogTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Before submitting your application, please review and accept our terms and privacy policy.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Terms and Conditions */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer">
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={openTerms}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline inline-flex items-center gap-1 font-medium"
                  >
                    <FileText className="w-3 h-3" />
                    Terms and Conditions
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </label>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="privacy" className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer">
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={openPrivacy}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline inline-flex items-center gap-1 font-medium"
                  >
                    <Shield className="w-3 h-3" />
                    Privacy Policy
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
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
            className="sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "Submitting..." : "Confirm & Submit Application"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}