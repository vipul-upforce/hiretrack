import { AlertCircle, CopyCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppSelector } from '@/lib/redux/hooks';

interface ChecklistDialogFooterProps {
  isChecklistMandatory: boolean;
  isSubmitting: boolean;
  submitPhase?: 'idle' | 'uploading' | 'submitting';
  handleCancel: () => void;
  handleSubmit: () => void;
  /** When > 0, show "Apply same form to remaining N candidates" */
  bulkRemainingCount?: number;
  applyToRemaining?: boolean;
  onApplyToRemainingChange?: (checked: boolean) => void;
}

function getSubmitButtonLabel(
  isSubmitting: boolean,
  submitPhase: 'idle' | 'uploading' | 'submitting',
): string {
  if (!isSubmitting) return 'Submit';
  if (submitPhase === 'uploading') return 'Uploading files...';
  if (submitPhase === 'submitting') return 'Submitting...';
  return 'Submitting...';
}

export function ChecklistDialogFooter({
  isChecklistMandatory,
  isSubmitting,
  submitPhase = 'idle',
  handleCancel,
  handleSubmit,
  bulkRemainingCount = 0,
  applyToRemaining = false,
  onApplyToRemainingChange,
}: ChecklistDialogFooterProps) {
  const { user } = useAppSelector((state) => state.auth || {});
  const busy = isSubmitting;
  const showApplyToRemaining =
    bulkRemainingCount > 0 && typeof onApplyToRemainingChange === 'function';
  return (
    <DialogFooter className="sticky bottom-[-50%] z-10 flex flex-col gap-3 border-t bg-background px-6 py-4">
      {showApplyToRemaining && (
        <div className="flex items-center space-x-2 rounded-lg  bg-primary/5 px-3 py-2">
          <Checkbox
            id="apply-to-remaining"
            checked={applyToRemaining}
            onCheckedChange={(checked) =>
              onApplyToRemainingChange?.(checked === true)
            }
            disabled={busy}
          />
          <Label
            htmlFor="apply-to-remaining"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium"
          >
            {/* <CopyCheck className="h-4 w-4 text-primary" /> */}
            Apply same answers to the remaining {bulkRemainingCount} candidate
            {bulkRemainingCount === 1 ? '' : 's'}
          </Label>
        </div>
      )}
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
        disabled={busy}
      >
        {isChecklistMandatory ? 'Cancel' : 'Skip'}
      </Button>
      <Button
        onClick={handleSubmit}
        variant="info"
        disabled={busy || !user?.id}
      >
        {getSubmitButtonLabel(isSubmitting, submitPhase)}
      </Button>
    </DialogFooter>
  );
}
