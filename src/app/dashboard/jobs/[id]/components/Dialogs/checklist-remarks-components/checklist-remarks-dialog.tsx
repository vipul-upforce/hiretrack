import {
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
  useUploadFilesMutation,
} from '@/lib/features/candidate/candidateApi';
import {
  useSubmitCandidateChecklistMutation,
  useGetJobLaneConfigQuery,
} from '@/lib/features/checklist/checklistApi';
import { useSendStatusMailMutation } from '@/lib/features/org/orgApi';
import logger from '@/lib/logger';
import React, { useState, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAppSelector } from '@/lib/redux/hooks';
import { getJobId } from '../../../utils/candidateAccessors';
import { ChecklistForm } from './ChecklistForm';
import { ChecklistRemarksSection } from './ChecklistRemarksSection';
import { ChecklistDialogFooter } from './ChecklistDialogFooter';
import { ChecklistDialogHeader } from './ChecklistDialogHeader';
import { ChecklistInfo, ChecklistRemarksDialogProps } from './types';
import { useChecklistFormState } from './hooks/useChecklistFormState';
import {
  useChecklistSubmit,
  type UseChecklistSubmitParams,
} from './hooks/useChecklistSubmit';

function ChecklistRemarksDialog({
  candidate,
  isOpen,
  onOpenChange,
  setOpenRemarksFor,
  refetch,
  checklistInfo,
  onChecklistSuccess,
  onChecklistCancel,
  bulkTotalCount = 0,
  onApplyToRemaining,
}: ChecklistRemarksDialogProps) {
  const [newRemark, setNewRemark] = useState('');
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null,
  );
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [applyToRemaining, setApplyToRemaining] = useState(false);

  const isBulkApplyAll = bulkTotalCount > 0 && Boolean(onApplyToRemaining);

  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [submitChecklist] = useSubmitCandidateChecklistMutation();
  const [uploadFiles] = useUploadFilesMutation();

  const { user } = useAppSelector((state) => state.auth || {});
  const organizationId = (user as { organizationId?: string })?.organizationId;

  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(
    getJobId(candidate) || '',
    { skip: !candidate.jobId },
  );

  const parsedChecklistInfo: ChecklistInfo | null = useMemo(() => {
    if (!checklistInfo) return null;
    try {
      return JSON.parse(checklistInfo);
    } catch (e) {
      logger.error(
        'ChecklistRemarksDialog: Failed to parse checklistInfo:',
        checklistInfo,
        e,
      );
      return null;
    }
  }, [checklistInfo]);

  const hasChecklist = Boolean(parsedChecklistInfo?.checklist);
  const isChecklistMandatory = parsedChecklistInfo?.isMandatory ?? false;

  const {
    checklistResponses,
    setChecklistResponses,
    fieldErrors,
    fieldTouched,
    handleChecklistFieldChange,
    validateChecklist,
  } = useChecklistFormState({ parsedChecklistInfo, hasChecklist });

  const { handleSubmit, handleCancel, isSubmitting, submitPhase } =
    useChecklistSubmit({
      candidate,
      parsedChecklistInfo,
      hasChecklist,
      jobLaneConfig,
      checklistResponses,
      setChecklistResponses,
      validateChecklist,
      remark: {
        newRemark,
        isSubRemarkPrivate,
        remarkRating,
        remarkRatingHistory,
      },
      bulk: {
        applyToRemaining,
        isBulkApplyAll,
        bulkTotalCount,
      },
      callbacks: {
        onOpenChange,
        setOpenRemarksFor,
        refetch,
        onApplyToRemaining,
        onChecklistSuccess,
        onChecklistCancel,
        onSuccess: async (result) => {
          const switchingToIncoming = result.transitionedToIncoming === true;
          if (!switchingToIncoming) {
            onOpenChange(false);
            setOpenRemarksFor('');
          }
          setNewRemark('');
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          setChecklistResponses({});
          await refetch();
          toast({
            title: 'Success',
            description: result.successMessage,
          });
          if (result.payload && onApplyToRemaining) {
            onApplyToRemaining(result.payload);
          } else if (result.hasChecklist && onChecklistSuccess && !switchingToIncoming) {
            onChecklistSuccess(result.candidateId);
          }
        },
      },
      user: user
        ? {
            id: (user as { id?: string }).id ?? '',
            name: (user as { name?: string }).name ?? '',
            email: (user as { email?: string }).email ?? '',
          }
        : null,
      organizationId,
      mutations: {
        updateCandidate,
        updateCandidateHistory,
        sendStatusMail,
        submitChecklist,
        uploadFiles,
      } as UseChecklistSubmitParams['mutations'],
    });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="flex max-h-[90vh] flex-col p-0">
        <ChecklistDialogHeader
          hasChecklist={hasChecklist}
          candidateName={candidate.name}
          parsedChecklistInfo={parsedChecklistInfo}
          isBulkApplyAll={isBulkApplyAll}
          bulkTotalCount={bulkTotalCount}
          applyToRemaining={applyToRemaining}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {hasChecklist && parsedChecklistInfo?.checklist ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">
                  {parsedChecklistInfo.checklistType === 'incoming'
                    ? 'Incoming'
                    : 'Outgoing'}{' '}
                  Checklist
                </h3>
                <ChecklistForm
                  checklist={parsedChecklistInfo.checklist}
                  responses={checklistResponses}
                  onResponseChange={handleChecklistFieldChange}
                  errors={fieldErrors}
                  touched={fieldTouched}
                />
                <Separator className="mt-4" />
              </div>
            ) : (
              <div className="h-2" />
            )}
          </div>

          <div className="z-20 bg-background px-6 py-4">
            <ChecklistRemarksSection
              newRemark={newRemark}
              setNewRemark={setNewRemark}
              remarkRating={remarkRating}
              setRemarkRating={setRemarkRating}
              setRemarkRatingHistory={setRemarkRatingHistory}
              isSubRemarkPrivate={isSubRemarkPrivate}
              setIsSubRemarkPrivate={setIsSubRemarkPrivate}
              handleSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>

        <ChecklistDialogFooter
          isChecklistMandatory={isChecklistMandatory}
          isSubmitting={isSubmitting}
          submitPhase={submitPhase}
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
          bulkRemainingCount={
            isBulkApplyAll ? 0 : Math.max(0, bulkTotalCount - 1)
          }
          applyToRemaining={applyToRemaining}
          onApplyToRemainingChange={setApplyToRemaining}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ChecklistRemarksDialog;
