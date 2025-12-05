import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { User } from '@/lib/features/users/usersApi';

interface ChecklistDialogFooterProps {
  isChecklistMandatory: boolean;
  isSubmitting: boolean;
  user: User | null;
  handleCancel: () => void;
  handleSubmit: () => void;
}

export function ChecklistDialogFooter({
  isChecklistMandatory,
  isSubmitting,
  user,
  handleCancel,
  handleSubmit,
}: ChecklistDialogFooterProps) {
  return (
    <DialogFooter className="border-t bg-background px-6 py-4 sticky bottom-[-50%] z-10">
      {isChecklistMandatory && (
        <div className="text-orange-400 flex flex-row items-center">
          <AlertCircle className="h-4 w-4 p-0 mr-2" color="orange" />
          This checklist is mandatory and must be completed before moving the
          candidate.
        </div>
      )}
      <Button
        variant="secondary"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        {isChecklistMandatory ? 'Cancel' : 'Skip'}
      </Button>
      <Button
        onClick={handleSubmit}
        variant="info"
        disabled={isSubmitting || !user?.id}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </DialogFooter>
  );
}
