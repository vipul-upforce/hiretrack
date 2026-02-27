import { useState, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { useClientSideChecklistValidation } from '@/app/dashboard/jobs/[id]/hooks/useClientSideChecklistValidation';
import { useAppSelector } from '@/lib/redux/hooks';
import type { StatusChangeValidationResult } from '@/components/unified-candidate-dialog/types';

export function useGlobalChecklistValidation(currentJobId?: string) {
  const { user } = useAppSelector((state) => state.auth || {});

  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(currentJobId as string, {
    skip: !currentJobId,
  });

  const { validateCompleteMovement } = useClientSideChecklistValidation(
    jobLaneConfig,
    user?.role,
  );

  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [pendingStatusAfterChecklist, setPendingStatusAfterChecklist] = useState<{
    candidateId: string;
    newStatus: string;
  } | null>(null);
  const [pendingIncomingChecklistAfterStatus, setPendingIncomingChecklistAfterStatus] =
    useState<string | null>(null);

  const onValidateStatusChange = useCallback(
    (candidate: Candidate, newStatus: string): StatusChangeValidationResult | null => {
      if (!validateCompleteMovement || candidate.status === newStatus)
        return null;
      const result = validateCompleteMovement(
        candidate,
        candidate.status,
        newStatus,
      );
      if (!result.validation.requiresChecklist) return null;
      const currentLane = candidate.status;
      const targetLane = newStatus;
      const validationInfo = {
        candidateId: candidate._id,
        currentLane,
        targetLane,
        checklist:
          'checklist' in result.validation ? result.validation.checklist : null,
        isMandatory: result.validation.isMandatory,
        checklistType: result.type,
      };
      if (
        'pendingValidation' in result &&
        result.pendingValidation?.requiresChecklist &&
        'pendingType' in result &&
        result.pendingType
      ) {
        const incomingInfo = JSON.stringify({
          candidateId: candidate._id,
          currentLane,
          targetLane,
          checklist:
            'checklist' in result.pendingValidation!
              ? result.pendingValidation!.checklist
              : null,
          isMandatory: result.pendingValidation!.isMandatory,
          checklistType: result.pendingType,
        });
        return {
          requiresChecklist: true,
          isMandatory: result.validation.isMandatory,
          // Step 0 = outgoing (current lane), step 1 = incoming (target lane). Unified dialog opens by checklistType.
          validationSteps: [
            {
              validationInfo: JSON.stringify(validationInfo),
              newStatusAfterStep: currentLane,
            },
            { validationInfo: incomingInfo, newStatusAfterStep: targetLane },
          ],
        };
      }
      return {
        requiresChecklist: true,
        validationInfo: JSON.stringify(validationInfo),
        isMandatory: result.validation.isMandatory,
      };
    },
    [validateCompleteMovement],
  );

  const onOpenChecklistAfterSave = useCallback(
    (validationInfo: string) => {
      setOpenRemarksFor(validationInfo);
    },
    [setOpenRemarksFor],
  );

  const onDeferStatusToChecklist = useCallback(
    (
      validationInfo: string,
      newStatus: string,
      nextChecklistValidationInfo?: string,
    ) => {
      try {
        const parsed = JSON.parse(validationInfo) as {
          candidateId: string;
          checklistType?: string;
        };
        // When we have two checklists, always open OUTGOING first and store INCOMING for after.
        const hasNext = !!nextChecklistValidationInfo?.trim();
        let toOpenNow: string = validationInfo;
        let toStoreForAfter: string | null = null;
        if (hasNext && nextChecklistValidationInfo) {
          try {
            const nextParsed = JSON.parse(nextChecklistValidationInfo) as {
              checklistType?: string;
            };
            const firstOutgoing = (parsed.checklistType ?? '') === 'outgoing';
            const nextIncoming =
              (nextParsed.checklistType ?? '') === 'incoming';
            const nextOutgoing =
              (nextParsed.checklistType ?? '') === 'outgoing';
            if (firstOutgoing && nextIncoming) {
              toOpenNow = validationInfo;
              toStoreForAfter = nextChecklistValidationInfo;
            } else if (
              (parsed.checklistType ?? '') === 'incoming' &&
              nextOutgoing
            ) {
              toOpenNow = nextChecklistValidationInfo;
              toStoreForAfter = validationInfo;
            } else if (nextOutgoing && !firstOutgoing) {
              toOpenNow = nextChecklistValidationInfo;
              toStoreForAfter = validationInfo;
            } else {
              const firstIsOutgoing = (parsed.checklistType ?? '') === 'outgoing';
              const nextIsOutgoing = (nextParsed.checklistType ?? '') === 'outgoing';
              if (nextIsOutgoing && !firstIsOutgoing) {
                toOpenNow = nextChecklistValidationInfo;
                toStoreForAfter = validationInfo;
              } else {
                toOpenNow = validationInfo;
                toStoreForAfter = nextChecklistValidationInfo;
              }
            }
          } catch {
            toOpenNow = validationInfo;
            toStoreForAfter = nextChecklistValidationInfo;
          }
        }
        const withFlag = {
          ...(JSON.parse(toOpenNow) as Record<string, unknown>),
          statusDeferredFromUnified: true,
        };
        const openingType = (withFlag as { checklistType?: string }).checklistType ?? '';
        if (
          openingType === 'incoming' &&
          toStoreForAfter
        ) {
          try {
            const other = JSON.parse(toStoreForAfter) as { checklistType?: string };
            if ((other.checklistType ?? '') === 'outgoing') {
              const swap = toOpenNow;
              toOpenNow = toStoreForAfter;
              toStoreForAfter = swap;
              Object.assign(withFlag, JSON.parse(toOpenNow) as Record<string, unknown>, {
                statusDeferredFromUnified: true,
              });
            }
          } catch {
            // ignore
          }
        }
        setOpenRemarksFor(JSON.stringify(withFlag));
        const candidateId = (parsed.candidateId ||
          (JSON.parse(toOpenNow) as { candidateId?: string }).candidateId) as string;
        setPendingStatusAfterChecklist({
          candidateId,
          newStatus,
        });
        if (toStoreForAfter) {
          try {
            const nextParsed = JSON.parse(toStoreForAfter) as Record<string, unknown>;
            setPendingIncomingChecklistAfterStatus(
              JSON.stringify({
                ...nextParsed,
                statusAlreadyApplied: true,
              }),
            );
          } catch {
            setPendingIncomingChecklistAfterStatus(null);
          }
        } else {
          setPendingIncomingChecklistAfterStatus(null);
        }
      } catch {
        setOpenRemarksFor(validationInfo);
        setPendingStatusAfterChecklist(null);
        setPendingIncomingChecklistAfterStatus(null);
      }
    },
    [setOpenRemarksFor, setPendingStatusAfterChecklist],
  );

  return {
    onValidateStatusChange,
    onDeferStatusToChecklist,
    onOpenChecklistAfterSave,
    openRemarksFor,
    setOpenRemarksFor,
    pendingStatusAfterChecklist,
    setPendingStatusAfterChecklist,
    pendingIncomingChecklistAfterStatus,
    setPendingIncomingChecklistAfterStatus,
  };
}
