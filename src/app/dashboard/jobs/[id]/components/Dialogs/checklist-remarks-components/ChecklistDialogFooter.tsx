import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useAppSelector } from '@/lib/redux/hooks';

interface ChecklistDialogFooterProps {
  isChecklistMandatory: boolean;
  isSubmitting: boolean;
  handleCancel: () => void;
  handleSubmit: () => void;
}

export function ChecklistDialogFooter({
  isChecklistMandatory,
  isSubmitting,
  handleCancel,
  handleSubmit,
}: ChecklistDialogFooterProps) {
  const { user } = useAppSelector((state) => state.auth || {});
  return (
    <DialogFooter className="sticky bottom-[-50%] z-10 border-t bg-background px-6 py-4">
      {isChecklistMandatory && (
        <div className="flex flex-row items-center text-orange-400">
          <AlertCircle className="mr-2 h-4 w-4 p-0" color="orange" />
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
