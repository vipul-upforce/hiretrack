/**
 * Create Candidate Dialog Footer Component
 * Displays action buttons for form submission
 */

import { Button } from "@/components/ui/button";

interface CreateCandidateDialogFooterProps {
  userRole: string | undefined;
  isSubmitting: boolean;
  isCreating: boolean;
  isLoading: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  onCancel: () => void;
  onApply: () => void;
  hasErrors: boolean;
}

export function CreateCandidateDialogFooter({
  userRole,
  isSubmitting,
  isCreating,
  isLoading,
  primaryColor,
  secondaryColor,
  onCancel,
  onApply,
  hasErrors,
}: CreateCandidateDialogFooterProps) {
  return (
    <div className="flex-shrink-0 flex justify-end bottom-0 space-x-2 border-t bg-background px-6 py-4 sticky z-999">
      <Button
        type="button"
        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        onClick={onApply}
        variant="primary"
        type={hasErrors ? "button" : "submit"}
        disabled={isSubmitting || isCreating || isLoading}
        onMouseEnter={(e) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = secondaryColor;
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = primaryColor;
        }}
        style={{ backgroundColor: primaryColor }}
      >
        {isSubmitting
          ? "Saving..."
          : userRole === "candidate" || userRole === ""
            ? "Apply"
            : "Add Candidate"}
      </Button>
    </div>
  );
}



