import type {
  ChecklistHistoryResponseItem,
  ChecklistFileItem,
  ChecklistSubmissionData,
} from '@/types/checklist';
import type { Candidate } from '@/types/candidate';
import { CandidateStatus } from '@/types/candidate';
import React, { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { sentStatusMailHandler } from '@/lib/utils';
import type { ChecklistInfo } from '../types';
import { buildChecklistSubmissionPayload } from '../utils/checklistPayload';
import { uploadPendingChecklistFiles } from '../utils/uploadChecklistFiles';

interface LaneConfigItem {
  laneId: string;
  laneName: string;
}

interface JobLaneConfigData {
  laneConfigs?: LaneConfigItem[];
}

export interface UseChecklistSubmitParams {
  candidate: Candidate;
  parsedChecklistInfo: ChecklistInfo | null;
  hasChecklist: boolean;
  jobLaneConfig: JobLaneConfigData | undefined;
  checklistResponses: Record<string, ChecklistHistoryResponseItem>;
  setChecklistResponses: React.Dispatch<
    React.SetStateAction<Record<string, ChecklistHistoryResponseItem>>
  >;
  validateChecklist: () => boolean;
  remark: {
    newRemark: string;
    isSubRemarkPrivate: boolean;
    remarkRating: number | null;
    remarkRatingHistory: number | null;
  };
  bulk: {
    applyToRemaining: boolean;
    isBulkApplyAll: boolean;
    bulkTotalCount: number;
  };
  callbacks: {
    onOpenChange: (open: boolean) => void;
    setOpenRemarksFor: (id: string | null) => void;
    refetch: () => void | Promise<unknown>;
    onApplyToRemaining?: (
      data: ChecklistSubmissionData,
    ) => void | Promise<{ transitionedToIncoming?: boolean } | void>;
    onChecklistSuccess?: (candidateId: string) => void;
    onChecklistCancel?: (candidateId: string) => void;
    /** When statusDeferredFromUnified: called with (candidateId, newStatus) and awaited before onSuccess. */
    onApplyDeferredStatus?: (
      candidateId: string,
      newStatus: string,
    ) => void | Promise<void>;
    onSuccess: (result: {
      payload: ChecklistSubmissionData | null;
      targetLane: string;
      currentLane: string;
      candidateId: string;
      hasChecklist: boolean;
      successMessage: string;
      /** Set when bulk two-phase submit opened the next (incoming) dialog; dialog should not close/clear */
      transitionedToIncoming?: boolean;
    }) => void | Promise<void>;
  };
  user: { id: string; name: string; email: string } | null;
  organizationId: string | undefined;
  /** RTK mutation triggers; typed loosely to accept actual API types. */
  mutations: {
    updateCandidate: (arg: unknown) => { unwrap: () => Promise<Candidate> };
    updateCandidateHistory: (arg: unknown) => {
      unwrap: () => Promise<unknown>;
    };
    sendStatusMail: (arg?: unknown) => unknown;
    submitChecklist: (arg: unknown) => { unwrap: () => Promise<unknown> };
    uploadFiles: (arg: unknown) => {
      unwrap: () => Promise<{
        files?: Array<{
          id: string;
          name: string;
          url: string;
          type: string;
          size: number;
        }>;
      }>;
    };
  };
}

export type SubmitPhase = 'idle' | 'uploading' | 'submitting';

export interface UseChecklistSubmitResult {
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
  isSubmitting: boolean;
  submitPhase: SubmitPhase;
}

function getLaneConfig(
  jobLaneConfig: JobLaneConfigData | undefined,
  parsedChecklistInfo: ChecklistInfo | null,
): LaneConfigItem | undefined {
  if (!parsedChecklistInfo?.checklist) return undefined;
  const laneId =
    parsedChecklistInfo.checklistType === 'incoming'
      ? parsedChecklistInfo.targetLane
      : parsedChecklistInfo.currentLane;
  return jobLaneConfig?.laneConfigs?.find((lc) => lc.laneId === laneId);
}

function hasPendingFiles(
  responses: Record<string, ChecklistHistoryResponseItem>,
): boolean {
  return Object.values(responses).some(
    (r) =>
      r.fieldType === 'file' &&
      Array.isArray(r.files) &&
      (r.files as ChecklistFileItem[]).some((f) => f.base64 && !f.url),
  );
}

/**
 * Encapsulates checklist submit and remark-only submit logic, including file upload and bulk apply.
 */
export function useChecklistSubmit({
  candidate,
  parsedChecklistInfo,
  hasChecklist,
  jobLaneConfig,
  checklistResponses,
  setChecklistResponses,
  validateChecklist,
  remark,
  bulk,
  callbacks,
  user,
  organizationId,
  mutations,
}: UseChecklistSubmitParams): UseChecklistSubmitResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');

  const {
    onOpenChange,
    setOpenRemarksFor,
    refetch,
    onApplyToRemaining,
    onChecklistSuccess,
    onChecklistCancel,
    onApplyDeferredStatus,
    onSuccess,
  } = callbacks;

  const handleCancel = useCallback(() => {
    if (hasChecklist && onChecklistCancel) {
      onChecklistCancel(candidate._id);
    }
    onOpenChange(false);
  }, [hasChecklist, onChecklistCancel, candidate._id, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || submitPhase !== 'idle') return;
    if (!validateChecklist()) return;
    if (!user) return;

    setIsSubmitting(true);
    let submittedChecklistPayload: ChecklistSubmissionData | null = null;

    try {
      if (hasChecklist && parsedChecklistInfo?.checklist) {
        const { checklist } = parsedChecklistInfo;
        const laneConfig = getLaneConfig(jobLaneConfig, parsedChecklistInfo);
        let responsesToSubmit = checklistResponses;

        if (hasPendingFiles(checklistResponses)) {
          if (!organizationId) {
            toast({
              title: 'Upload failed',
              description: 'Session expired. Please refresh and try again.',
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }
          setSubmitPhase('uploading');
          try {
            responsesToSubmit = await uploadPendingChecklistFiles(
              checklistResponses,
              (params) => mutations.uploadFiles(params).unwrap(),
              organizationId,
            );
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Failed to upload file.';
            toast({
              title: 'Upload failed',
              description: message,
              variant: 'destructive',
            });
            setIsSubmitting(false);
            setSubmitPhase('idle');
            return;
          }
        }
        setSubmitPhase('submitting');

        const remarkPayload = remark.newRemark.trim()
          ? {
              description: remark.newRemark.trim(),
              isPrivate: remark.isSubRemarkPrivate,
              rating: remark.remarkRating ?? undefined,
            }
          : undefined;

        if (bulk.isBulkApplyAll && onApplyToRemaining) {
          const laneConfigForPayload = getLaneConfig(
            jobLaneConfig,
            parsedChecklistInfo,
          );
          const payload = buildChecklistSubmissionPayload({
            parsedChecklistInfo,
            laneName: laneConfigForPayload?.laneName ?? '',
            responses: responsesToSubmit,
            remark: remarkPayload
              ? {
                  description: remarkPayload.description,
                  isPrivate: remarkPayload.isPrivate,
                  rating: remarkPayload.rating,
                }
              : undefined,
          });
          const applyResult = (await onApplyToRemaining(payload)) as
            | { transitionedToIncoming?: boolean }
            | undefined;
          await onSuccess({
            payload: null,
            targetLane: parsedChecklistInfo?.targetLane ?? '',
            currentLane: parsedChecklistInfo?.currentLane ?? '',
            candidateId: candidate._id,
            hasChecklist: true,
            successMessage: `Checklist applied to ${bulk.bulkTotalCount} candidate(s)`,
            transitionedToIncoming: applyResult?.transitionedToIncoming,
          });
          return;
        }

        const submitData = buildChecklistSubmissionPayload({
          parsedChecklistInfo,
          laneName: laneConfig?.laneName ?? '',
          responses: responsesToSubmit,
          remark: remarkPayload
            ? {
                description: remarkPayload.description,
                isPrivate: remarkPayload.isPrivate,
                rating: remarkPayload.rating,
              }
            : undefined,
        });

        await mutations
          .submitChecklist({
            candidateId: candidate._id,
            data: {
              ...submitData,
              checklistType: parsedChecklistInfo.checklistType!,
            },
          })
          .unwrap();

        if (parsedChecklistInfo.hasPendingChecklist) {
          await onSuccess({
            payload: submittedChecklistPayload ?? null,
            candidateId: candidate._id,
            hasChecklist: true,
            successMessage: 'Checklist submitted successfully',
          });
          return;
        }

        // Status was deferred from unified dialog; apply via parent callback then onSuccess
        if (parsedChecklistInfo.statusDeferredFromUnified) {
          if (onApplyDeferredStatus) {
            await Promise.resolve(
              onApplyDeferredStatus(
                String(candidate._id),
                parsedChecklistInfo.targetLane ?? '',
              ),
            );
          }
          await onSuccess({
            payload: null,
            candidateId: candidate._id,
            hasChecklist: true,
            successMessage: 'Checklist submitted successfully',
          });
          return;
        }

        // Second of two checklists from unified: status already applied after first; only submit checklist
        if (parsedChecklistInfo.statusAlreadyApplied) {
          await onSuccess({
            payload: submittedChecklistPayload ?? null,
            candidateId: candidate._id,
            hasChecklist: true,
            successMessage: 'Checklist submitted successfully',
          });
          return;
        }

        const updatedCandidate = await mutations
          .updateCandidate({
            _id: candidate._id,
            status: parsedChecklistInfo.targetLane as CandidateStatus,
          })
          .unwrap();

        await sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: parsedChecklistInfo.currentLane,
          },
          mutations.sendStatusMail,
          {
            remark: remark.newRemark.trim(),
            rating: remark.remarkRating ?? undefined,
          },
        );

        if (bulk.applyToRemaining && onApplyToRemaining) {
          const laneConfigForPayload = getLaneConfig(
            jobLaneConfig,
            parsedChecklistInfo,
          );
          submittedChecklistPayload = buildChecklistSubmissionPayload({
            parsedChecklistInfo,
            laneName: laneConfigForPayload?.laneName ?? '',
            responses: responsesToSubmit,
            remark: remarkPayload
              ? {
                  description: remarkPayload.description,
                  isPrivate: remarkPayload.isPrivate,
                  rating: remarkPayload.rating,
                }
              : undefined,
          });
        }

        await onSuccess({
          payload: submittedChecklistPayload,
          candidateId: candidate._id,
          hasChecklist: true,
          successMessage: 'Checklist submitted successfully',
        });
        return;
      }

      if (remark.newRemark.trim()) {
        const newRemarkObj = {
          description: String(remark.newRemark).trim(),
          date: new Date().toISOString(),
          rating: remark.remarkRating ? Number(remark.remarkRating) : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
        };

        const newRemarkHistoryObj = {
          description: String(remark.newRemark).trim(),
          isPrivate: remark.isSubRemarkPrivate,
          date: new Date().toISOString(),
          rating: remark.remarkRatingHistory
            ? Number(remark.remarkRatingHistory)
            : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
        };

        const newHistoryEntry = {
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: null,
          remark: newRemarkHistoryObj,
          assignmentBy: user.id,
          title: null,
          note: {
            description: '',
            date: '',
            rating: 0,
            userId: null,
          },
          attachments: [],
        };

        await mutations
          .updateCandidateHistory({
            candidateId: candidate._id,
            jobId: candidate.jobId,
            newEntry: newHistoryEntry,
          })
          .unwrap();

        const updatedCandidate = await mutations
          .updateCandidate({
            _id: candidate._id,
            name: candidate.name,
            remarks: [...(candidate.remarks || []), newRemarkObj],
          })
          .unwrap();

        await sentStatusMailHandler(
          updatedCandidate,
          mutations.sendStatusMail,
          {
            remark: remark.newRemark.trim(),
            rating: remark.remarkRating ?? undefined,
          },
        );

        await onSuccess({
          payload: null,
          candidateId: candidate._id,
          hasChecklist: false,
          successMessage: 'Remark added successfully',
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
      setSubmitPhase('idle');
    }
  }, [
    isSubmitting,
    submitPhase,
    validateChecklist,
    user,
    hasChecklist,
    parsedChecklistInfo,
    jobLaneConfig,
    checklistResponses,
    remark,
    bulk,
    candidate,
    organizationId,
    mutations,
    onApplyToRemaining,
    onSuccess,
    onApplyDeferredStatus,
  ]);

  return {
    handleSubmit,
    handleCancel,
    isSubmitting,
    submitPhase,
  };
}
