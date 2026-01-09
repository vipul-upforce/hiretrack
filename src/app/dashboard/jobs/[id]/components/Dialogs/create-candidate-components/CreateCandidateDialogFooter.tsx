/**
 * Create Candidate Dialog Footer Component
 * Displays action buttons for form submission
 */

import { Button } from '@/components/ui/button';

interface CreateCandidateDialogFooterProps {
  userRole: string | undefined;
  isSubmitting: boolean;
  isCreating: boolean;
  isLoading: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  onCancel: () => void;
  onApply: () => void;
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
}: CreateCandidateDialogFooterProps) {
  return (
    <div className="z-999 sticky bottom-0 flex flex-shrink-0 justify-end space-x-2 border-t bg-background px-6 py-4">
      <Button
        type="button"
        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        onClick={onApply}
        variant="primary"
        type="button"
        disabled={isSubmitting || isCreating || isLoading}
        onMouseEnter={(e) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = secondaryColor || '';
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLElement;
          target.style.backgroundColor = primaryColor || '';
        }}
        style={{ backgroundColor: primaryColor }}
      >
        {(() => {
          if (isSubmitting || isCreating || isLoading) return 'Saving...';
          if (userRole === 'candidate' || userRole === '') return 'Apply';
          return 'Add Candidate';
        })()}
      </Button>
    </div>
  );
}
