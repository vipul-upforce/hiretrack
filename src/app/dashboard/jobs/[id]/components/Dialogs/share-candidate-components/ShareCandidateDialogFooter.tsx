/**
 * Share Candidate Dialog Footer Component
 * Displays action buttons for PDF generation
 */

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ShareCandidateDialogFooterProps {
  isGenerating: boolean;
  selectedCount: number;
  onCancel: () => void;
  onGeneratePDF: () => void;
}

export function ShareCandidateDialogFooter({
  isGenerating,
  selectedCount,
  onCancel,
  onGeneratePDF,
}: ShareCandidateDialogFooterProps) {
  return (
    <div className="flex justify-end w-full gap-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={onGeneratePDF}
        disabled={isGenerating || selectedCount === 0}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download PDF
          </>
        )}
      </Button>
    </div>
  );
}
