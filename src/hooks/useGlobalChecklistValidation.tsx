import { useState, useCallback, useRef } from 'react';
import { Candidate } from '@/types/candidate';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { useClientSideChecklistValidation } from '@/app/dashboard/jobs/[id]/hooks/useClientSideChecklistValidation';
import { useAppSelector } from '@/lib/redux/hooks';
import { useUpdateCandidateMutation } from '@/lib/features/candidate/candidateApi';
import { useUnifiedDialogChecklistJob } from '@/contexts/unified-dialog-checklist-job-context';
import type { StatusChangeValidationResult } from '@/components/unified-candidate-dialog/types';
import { setActorJustStatusUpdatedCandidateId } from '@/lib/sseActorStatus';

type PendingStatus = { candidateId: string; newStatus: string } | null;

/**
 * Checklist validation state and callbacks. When the unified candidate action dialog
 * is open, the job lane config is loaded for that dialog's job (from global state);
 * otherwise the passed currentJobId is used. All other state (openRemarksFor, pending, etc.)
 * stays local to the caller as before.
 */
export function useGlobalChecklistValidation(currentJobId?: string) {
  const { user } = useAppSelector((state) => state.auth || {});
  const unifiedDialog = useUnifiedDialogChecklistJob();

  /** Use job from unified dialog when it is open; otherwise use the passed currentJobId. */
  const effectiveJobId =
    (unifiedDialog?.unifiedDialogJobId != null && unifiedDialog.unifiedDialogJobId !== '')
      ? unifiedDialog.unifiedDialogJobId
      : currentJobId;

  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(effectiveJobId as string, {
    skip: !effectiveJobId,
  });

  const { validateCompleteMovement } = useClientSideChecklistValidation(
    jobLaneConfig,
    user?.role,
    {
      skipAlreadyCompletedCheck:
        unifiedDialog != null &&
        unifiedDialog.unifiedDialogJobId != null &&
        unifiedDialog.unifiedDialogJobId !== '',
    },
  );

  const [openRemarksFor, setOpenRemarksFor] = useState<string | null>(null);
  const [pendingStatusAfterChecklistState, setPendingStatusAfterChecklistState] =
    useState<PendingStatus>(null);
  const pendingStatusAfterChecklistRef = useRef<PendingStatus>(null);

  /** Setter that keeps state and ref in sync so callbacks (e.g. onChecklistSuccess) can read from ref and avoid stale closure after dialog unmounts. */
  const setPendingStatusAfterChecklist = useCallback((value: PendingStatus) => {
    setPendingStatusAfterChecklistState(value);
    pendingStatusAfterChecklistRef.current = value;
  }, []);

  const [pendingIncomingChecklistAfterStatus, setPendingIncomingChecklistAfterStatus] =
    useState<string | null>(null);

  const [updateCandidate] = useUpdateCandidateMutation();

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
      // NOTE: Global unified dialog currently does not support two-step (outgoing+incoming)
      // flows via validationSteps. For simplicity, treat even the two-checklist case as a
      // single step here and let drag/bulk flows handle the full two-phase logic.
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
      // Checklist opened after status update succeeded – mark statusAlreadyApplied
      // so useChecklistSubmit skips a redundant status PUT.
      try {
        const parsed = JSON.parse(validationInfo) as Record<string, unknown>;
        const withFlag = { ...parsed, statusAlreadyApplied: true };
        setOpenRemarksFor(JSON.stringify(withFlag));
      } catch {
        // Fallback to original behavior if JSON is malformed
        setOpenRemarksFor(validationInfo);
      }
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

  /**
   * Called after a checklist dialog (opened via unified actions) completes successfully.
   * Single candidate: apply deferred status via PUT. Then open second (incoming) checklist if required.
   */
  const handleChecklistComplete = useCallback(
    async (candidateId: string) => {
      if (
        !pendingStatusAfterChecklistRef.current ||
        pendingStatusAfterChecklistRef.current.candidateId !== candidateId
      ) {
        return;
      }

      const { newStatus } = pendingStatusAfterChecklistRef.current;

      try {
        // setActorJustStatusUpdatedCandidateId(candidateId);
        await updateCandidate({
          _id: candidateId,
          status: newStatus as CandidateStatus,
        }).unwrap();

        if (pendingIncomingChecklistAfterStatus) {
          setOpenRemarksFor(pendingIncomingChecklistAfterStatus);
          setPendingIncomingChecklistAfterStatus(null);
        }
      } finally {
        setPendingStatusAfterChecklist(null);
      }
    },
    [
      updateCandidate,
      pendingIncomingChecklistAfterStatus,
      pendingStatusAfterChecklistRef,
      setOpenRemarksFor,
      setPendingIncomingChecklistAfterStatus,
      setPendingStatusAfterChecklist,
    ],
  );

  return {
    onValidateStatusChange,
    onDeferStatusToChecklist,
    onOpenChecklistAfterSave,
    openRemarksFor,
    setOpenRemarksFor,
    pendingStatusAfterChecklist: pendingStatusAfterChecklistState,
    setPendingStatusAfterChecklist,
    pendingStatusAfterChecklistRef,
    pendingIncomingChecklistAfterStatus,
    setPendingIncomingChecklistAfterStatus,
    handleChecklistComplete,
  };
}
