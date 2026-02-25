import React, { useCallback } from 'react';
import { useBulkUpdateCandidatesMutation } from '@/lib/features/candidate/candidateApi';
import type { BulkStatusQueueItem } from '@/components/unified-candidate-dialog/types';
import { useToast } from '@/hooks/use-toast';
import {
  buildChecklistPlan,
  parseIsMandatory,
  type ChecklistPlanStep,
} from '../utils/checklistGatekeeper';

/** Group items by newStatus and return map of status -> candidateIds */
function groupByStatus(
  items: BulkStatusQueueItem[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    const ids = map.get(item.newStatus) ?? [];
    ids.push(item.candidateId);
    map.set(item.newStatus, ids);
  }
  return map;
}

/**
 * Groups mandatory candidates by same checklist (same key). Opens one dialog per group.
 * For each group we bulk-submit-checklist once for all in that group (no one-by-one submit).
 */
export function useBulkStatusQueue({
  setOpenRemarksFor,
  setBulkStatusQueue,
  setPendingStatusAfterChecklist,
  setRemainingChecklistSteps,
  refetch,
}: {
  setOpenRemarksFor: (id: string | null) => void;
  setBulkStatusQueue: React.Dispatch<
    React.SetStateAction<BulkStatusQueueItem[] | null>
  >;
  setPendingStatusAfterChecklist: (v: {
    candidateId: string;
    newStatus: string;
  } | null) => void;
  setRemainingChecklistSteps: React.Dispatch<
    React.SetStateAction<ChecklistPlanStep[] | null>
  >;
  refetch: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();

  const runBulkStatusUpdates = useCallback(
    async (items: BulkStatusQueueItem[]) => {
      const byStatus = groupByStatus(items);
      for (const [status, candidateIds] of byStatus) {
        await bulkUpdateCandidates({
          operation: 'statusUpdate',
          candidateIds,
          status,
        }).unwrap();
      }
    },
    [bulkUpdateCandidates],
  );

  const onBulkStatusRequiresChecklist = useCallback(
    (queue: BulkStatusQueueItem[]) => {
      if (queue.length === 0) {
        setBulkStatusQueue(null);
        setRemainingChecklistSteps(null);
        refetch();
        toast({ title: 'Success', description: 'Bulk status update complete' });
        return;
      }

      const needChecklist = queue.filter((item) => item.validationInfo != null);
      const noChecklist = queue.filter((item) => item.validationInfo == null);
      const optionalNeedChecklist = needChecklist.filter(
        (item) => !parseIsMandatory(item.validationInfo),
      );
      const mandatoryNeedChecklist = needChecklist.filter((item) =>
        parseIsMandatory(item.validationInfo),
      );
      const toUpdateNow = [...noChecklist, ...optionalNeedChecklist];

      if (mandatoryNeedChecklist.length === 0) {
        setBulkStatusQueue(null);
        setRemainingChecklistSteps(null);
        (async () => {
          try {
            await runBulkStatusUpdates(toUpdateNow);
            await refetch();
            toast({
              title: 'Success',
              description: `Updated ${toUpdateNow.length} candidate(s)`,
            });
          } catch (err) {
            toast({
              title: 'Error',
              description:
                (err as Error)?.message ?? 'Failed to update candidates',
              variant: 'destructive',
            });
            await refetch();
          }
        })();
        return;
      }

      (async () => {
        try {
          if (toUpdateNow.length > 0) {
            await runBulkStatusUpdates(toUpdateNow);
            await refetch();
          }
        } catch (err) {
          toast({
            title: 'Error',
            description:
              (err as Error)?.message ?? 'Failed to update some candidates',
            variant: 'destructive',
          });
          return;
        }

        // Group by same checklist key: one dialog per group, bulk-submit per group
        const plan = buildChecklistPlan(mandatoryNeedChecklist);
        const firstStep = plan.steps[0];
        if (!firstStep || firstStep.type !== 'showChecklist') {
          setBulkStatusQueue(null);
          setRemainingChecklistSteps(null);
          return;
        }

        setBulkStatusQueue(firstStep.items);
        setRemainingChecklistSteps(plan.steps.length > 1 ? plan.steps.slice(1) : null);
        setOpenRemarksFor(firstStep.validationInfo);
        setPendingStatusAfterChecklist({
          candidateId: firstStep.items[0].candidateId,
          newStatus: firstStep.newStatus,
        });
      })();
    },
    [
      setOpenRemarksFor,
      setBulkStatusQueue,
      setPendingStatusAfterChecklist,
      setRemainingChecklistSteps,
      refetch,
      toast,
      runBulkStatusUpdates,
    ],
  );

  return {
    onBulkStatusRequiresChecklist,
  };
}
