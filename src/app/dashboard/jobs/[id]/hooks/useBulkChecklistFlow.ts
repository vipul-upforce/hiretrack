import { useState, useCallback } from 'react';
import type { BulkStatusQueueItem } from '@/components/unified-candidate-dialog/types';
import type { ChecklistSubmissionData } from '@/types/checklist';
import { type ChecklistPlanStep, parseIsMandatory } from '../utils/checklistGatekeeper';
import { useBulkSubmitChecklistMutation } from '@/lib/features/checklist/checklistApi';
import { useBulkUpdateCandidatesMutation } from '@/lib/features/candidate/candidateApi';
import { useToast } from '@/hooks/use-toast';
import { useAppDispatch } from '@/lib/redux/hooks';
import { clearSelectedCandidates } from '@/lib/redux/selectedCandidatesSlice';
import { useBulkStatusQueue } from './useBulkStatusQueue';

export function useBulkChecklistFlow({
  setOpenRemarksFor,
  setPendingStatusAfterChecklist,
  refetch,
}: {
  setOpenRemarksFor: (id: string | null) => void;
  setPendingStatusAfterChecklist: (v: {
    candidateId: string;
    newStatus: string;
  } | null) => void;
  refetch: () => Promise<unknown>;
}) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [bulkSubmitChecklist] = useBulkSubmitChecklistMutation();
  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();

  const [bulkStatusQueue, setBulkStatusQueue] = useState<BulkStatusQueueItem[] | null>(null);
  const [remainingChecklistSteps, setRemainingChecklistSteps] = useState<ChecklistPlanStep[] | null>(null);

  const { onBulkStatusRequiresChecklist } = useBulkStatusQueue({
    setOpenRemarksFor,
    setBulkStatusQueue,
    setPendingStatusAfterChecklist,
    setRemainingChecklistSteps,
    refetch,
  });

  /**
   * Bulk-submit-checklist for the current group only (same checklist), then update status for that group.
   * If there are more groups (different checklist), open the next group's dialog; else clear and done.
   */
  const onApplyToRemaining = useCallback(
    (payload: ChecklistSubmissionData) => {
      if (!bulkStatusQueue || bulkStatusQueue.length === 0) return;
      const candidates = bulkStatusQueue.map((item) => ({
        candidateId: item.candidateId,
        newStatus: item.newStatus,
      }));
      const newStatus = bulkStatusQueue[0].newStatus;
      const candidateIds = bulkStatusQueue.map((item) => item.candidateId);
      const nextSteps = remainingChecklistSteps ?? [];

      const isMandatory = parseIsMandatory(bulkStatusQueue[0]?.validationInfo);

      (async () => {
        try {
          await bulkSubmitChecklist({ data: payload, candidates }).unwrap();
          if (isMandatory) {
            await bulkUpdateCandidates({
              operation: 'statusUpdate',
              candidateIds,
              status: newStatus,
            }).unwrap();
          }
          await refetch();
          toast({
            title: 'Success',
            description: isMandatory
              ? `Checklist applied and status updated for ${candidates.length} candidate(s)`
              : `Checklist applied for ${candidates.length} candidate(s)`,
          });

          if (nextSteps.length === 0) {
            setBulkStatusQueue(null);
            setPendingStatusAfterChecklist(null);
            setRemainingChecklistSteps(null);
            setOpenRemarksFor(null);
            dispatch(clearSelectedCandidates());
            return;
          }

          const nextStep = nextSteps[0];
          const restSteps = nextSteps.slice(1);
          if (nextStep.type === 'showChecklist') {
            setBulkStatusQueue(nextStep.items);
            setRemainingChecklistSteps(restSteps.length > 0 ? restSteps : null);
            setOpenRemarksFor(nextStep.validationInfo);
            setPendingStatusAfterChecklist({
              candidateId: nextStep.items[0].candidateId,
              newStatus: nextStep.newStatus,
            });
          } else {
            setRemainingChecklistSteps(restSteps.length > 0 ? restSteps : null);
          }
        } catch (err) {
          toast({
            title: 'Error',
            description:
              (err as { data?: { error?: string } })?.data?.error ??
              (err as Error)?.message ??
              'Failed to apply checklist to candidates',
            variant: 'destructive',
          });
        }
      })();
    },
    [
      bulkStatusQueue,
      remainingChecklistSteps,
      bulkSubmitChecklist,
      bulkUpdateCandidates,
      refetch,
      toast,
      setOpenRemarksFor,
      setPendingStatusAfterChecklist,
      dispatch,
    ],
  );

  /** No-op: we only use bulk-submit per group via onApplyToRemaining. */
  const onBulkQueueStepComplete = useCallback(() => {}, []);

  const onBulkChecklistCancel = useCallback(() => {
    setBulkStatusQueue(null);
    setPendingStatusAfterChecklist(null);
    setRemainingChecklistSteps(null);
    setOpenRemarksFor(null);
    dispatch(clearSelectedCandidates());
  }, [setOpenRemarksFor, setPendingStatusAfterChecklist, dispatch]);

  return {
    bulkStatusQueue,
    setBulkStatusQueue,
    onBulkStatusRequiresChecklist,
    onApplyToRemaining,
    onBulkQueueStepComplete,
    onBulkChecklistCancel,
  };
}
