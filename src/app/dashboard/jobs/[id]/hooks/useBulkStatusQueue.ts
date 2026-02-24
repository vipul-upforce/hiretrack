import React, { useCallback } from 'react';
import { useUpdateCandidateMutation } from '@/lib/features/candidate/candidateApi';
import { CandidateStatus } from '@/types/candidate';
import type { BulkStatusQueueItem } from '@/components/unified-candidate-dialog/types';
import { useToast } from '@/hooks/use-toast';

function parseIsMandatory(validationInfo: string | undefined): boolean {
  if (!validationInfo) return true;
  try {
    const parsed = JSON.parse(validationInfo) as { isMandatory?: boolean };
    return parsed.isMandatory === true;
  } catch {
    return true;
  }
}

/**
 * Opens the checklist dialog once for the full set of candidates that require a checklist.
 * Optional checklist: save status update first, then open dialog (per rule: don't open before save).
 * Mandatory checklist: open dialog first; status is updated on submit.
 */
export function useBulkStatusQueue({
  setOpenRemarksFor,
  setBulkStatusQueue,
  setPendingStatusAfterChecklist,
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
  refetch: () => Promise<unknown>;
}) {
  const { toast } = useToast();
  const [updateCandidate] = useUpdateCandidateMutation();

  const onBulkStatusRequiresChecklist = useCallback(
    (queue: BulkStatusQueueItem[]) => {
      if (queue.length === 0) {
        setBulkStatusQueue(null);
        refetch();
        toast({ title: 'Success', description: 'Bulk status update complete' });
        return;
      }

      const needChecklist = queue.filter((item) => item.validationInfo != null);
      const noChecklist = queue.filter((item) => item.validationInfo == null);

      if (needChecklist.length === 0) {
        setBulkStatusQueue(null);
        (async () => {
          try {
            for (const item of noChecklist) {
              await updateCandidate({
                _id: item.candidateId,
                status: item.newStatus as CandidateStatus,
              }).unwrap();
            }
            await refetch();
            toast({
              title: 'Success',
              description: `Updated ${noChecklist.length} candidate(s)`,
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

      const optionalNeedChecklist = needChecklist.filter(
        (item) => !parseIsMandatory(item.validationInfo),
      );

      (async () => {
        try {
          for (const item of noChecklist) {
            await updateCandidate({
              _id: item.candidateId,
              status: item.newStatus as CandidateStatus,
            }).unwrap();
          }
          for (const item of optionalNeedChecklist) {
            await updateCandidate({
              _id: item.candidateId,
              status: item.newStatus as CandidateStatus,
            }).unwrap();
          }
          if (noChecklist.length > 0 || optionalNeedChecklist.length > 0) {
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

        setBulkStatusQueue(needChecklist);
        setOpenRemarksFor(needChecklist[0].validationInfo ?? null);
        setPendingStatusAfterChecklist({
          candidateId: needChecklist[0].candidateId,
          newStatus: needChecklist[0].newStatus,
        });
      })();
    },
    [
      setOpenRemarksFor,
      setBulkStatusQueue,
      setPendingStatusAfterChecklist,
      refetch,
      toast,
      updateCandidate,
    ],
  );

  return {
    onBulkStatusRequiresChecklist,
  };
}
