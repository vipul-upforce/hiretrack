import React, { useCallback } from 'react';
import { useBulkUpdateCandidatesMutation } from '@/lib/features/candidate/candidateApi';
import type { BulkStatusQueueItem } from '@/components/unified-candidate-dialog/types';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
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
        logger.info('[BulkStatusQueue] runBulkStatusUpdates', {
          status,
          candidateIds,
        });
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
      logger.info('[BulkStatusQueue] onBulkStatusRequiresChecklist called', {
        totalItems: queue.length,
      });
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
      const toUpdateNow = [...noChecklist, ...optionalNeedChecklist];

      logger.info('[BulkStatusQueue] partitioned queue', {
        needChecklistCount: needChecklist.length,
        noChecklistCount: noChecklist.length,
        optionalNeedChecklistCount: optionalNeedChecklist.length,
        toUpdateNowCount: toUpdateNow.length,
      });

      if (needChecklist.length === 0) {
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
        const plan = buildChecklistPlan(needChecklist);
        logger.info('[BulkStatusQueue] built checklist plan', {
          steps: plan.steps.map((s) =>
            s.type === 'showChecklist'
              ? {
                  type: s.type,
                  candidateIds: s.candidateIds,
                  newStatus: s.newStatus,
                }
              : {
                  type: s.type,
                  candidateIds: s.candidateIds,
                  newStatus: s.newStatus,
                },
          ),
        });
        // When we have both outgoing and incoming steps, open OUTGOING first (same as drag/single defer).
        const steps = plan.steps.slice().sort((a, b) => {
          if (a.type !== 'showChecklist' || b.type !== 'showChecklist') return 0;
          let aOut = false; let bOut = false;
          try {
            aOut = (JSON.parse(a.validationInfo) as { checklistType?: string }).checklistType === 'outgoing';
          } catch { /* ignore */ }
          try {
            bOut = (JSON.parse(b.validationInfo) as { checklistType?: string }).checklistType === 'outgoing';
          } catch { /* ignore */ }
          if (aOut && !bOut) return -1;
          if (!aOut && bOut) return 1;
          return 0;
        });
        const firstStep = steps[0];
        if (!firstStep || firstStep.type !== 'showChecklist') {
          setBulkStatusQueue(null);
          setRemainingChecklistSteps(null);
          return;
        }
        const restSteps = plan.steps.length > 1 ? plan.steps.slice(1) : null;
        const restStepsOrdered = restSteps ? restSteps.slice().sort((a, b) => {
          if (a.type !== 'showChecklist' || b.type !== 'showChecklist') return 0;
          let aOut = false; let bOut = false;
          try {
            aOut = (JSON.parse(a.validationInfo) as { checklistType?: string }).checklistType === 'outgoing';
          } catch { /* ignore */ }
          try {
            bOut = (JSON.parse(b.validationInfo) as { checklistType?: string }).checklistType === 'outgoing';
          } catch { /* ignore */ }
          if (aOut && !bOut) return -1;
          if (!aOut && bOut) return 1;
          return 0;
        }) : null;

        logger.info('[BulkStatusQueue] opening first checklist step', {
          candidateIds: firstStep.candidateIds,
          newStatus: firstStep.newStatus,
        });

        setBulkStatusQueue(firstStep.items);
        setRemainingChecklistSteps(restStepsOrdered && restStepsOrdered.length > 0 ? restStepsOrdered : null);
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
