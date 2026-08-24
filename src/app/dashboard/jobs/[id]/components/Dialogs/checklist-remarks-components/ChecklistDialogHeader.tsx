import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ClipboardCheck } from 'lucide-react';
import type { ChecklistInfo } from './types';

export interface ChecklistDialogHeaderProps {
  hasChecklist: boolean;
  candidateName: string;
  parsedChecklistInfo: ChecklistInfo | null;
  isBulkApplyAll: boolean;
  bulkTotalCount: number;
  applyToRemaining: boolean;
}

/**
 * Title and description for the checklist/remarks dialog.
 * Centralizes the conditional copy for single, bulk, and apply-to-remaining modes.
 */
export function ChecklistDialogHeader({
  hasChecklist,
  candidateName,
  parsedChecklistInfo,
  isBulkApplyAll,
  bulkTotalCount,
  applyToRemaining,
}: ChecklistDialogHeaderProps) {
  const title = (() => {
    if (!hasChecklist) return `Add Remarks for ${candidateName}`;
    const checklistName =
      parsedChecklistInfo?.checklist?.name ?? 'Checklist';
    if (isBulkApplyAll && bulkTotalCount > 0) {
      return `${checklistName} (${bulkTotalCount} candidate${bulkTotalCount === 1 ? '' : 's'})`;
    }
    if (applyToRemaining && bulkTotalCount > 0) {
      return `${checklistName} - ${candidateName} (apply same to ${bulkTotalCount - 1} remaining)`;
    }
    return `${checklistName} - ${candidateName}`;
  })();

  const description = (() => {
    if (!hasChecklist) {
      return 'Add your observations and feedback for this candidate.';
    }
    if (isBulkApplyAll && bulkTotalCount > 0) {
      const plural = bulkTotalCount === 1 ? '' : 's';
      return `Your answers will be applied to all ${bulkTotalCount} candidate${plural}.`;
    }
    if (applyToRemaining && bulkTotalCount > 0) {
      const plural = bulkTotalCount - 1 === 1 ? '' : 's';
      return `Your answers will be applied to this candidate and ${bulkTotalCount - 1} remaining candidate${plural}.`;
    }
    return (
      parsedChecklistInfo?.checklist?.description ??
      'Please complete the checklist before proceeding.'
    );
  })();

  return (
    <DialogHeader className="border-b px-6 py-4 pr-12">
      <DialogTitle className="flex items-center gap-2">
        {hasChecklist && <ClipboardCheck className="h-5 w-5" />}
        {title}
      </DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}
