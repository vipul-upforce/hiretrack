import {
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
} from '@/lib/features/candidate/candidateApi';
import {
  useSubmitCandidateChecklistMutation,
  useGetJobLaneConfigQuery,
} from '@/lib/features/checklist/checklistApi';
import logger from '@/lib/logger';
import { CandidateStatus } from '@/types/candidate';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { sentStatusMailHandler } from '@/lib/utils';
import { useSendStatusMailMutation } from '@/lib/features/org/orgApi';
import { ClipboardCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  ChecklistFieldChangeHandler,
  ChecklistHistoryResponseItem,
} from '@/types/checklist';
import { useAppSelector } from '@/lib/redux/hooks';
import { getJobId } from '../../../utils/candidateAccessors';
import { ChecklistForm } from './ChecklistForm';
import { ChecklistRemarksSection } from './ChecklistRemarksSection';
import { ChecklistDialogFooter } from './ChecklistDialogFooter';
import { ChecklistInfo, ChecklistRemarksDialogProps } from './types';

function ChecklistRemarksDialog({
  candidate,
  isOpen,
  onOpenChange,
  setOpenRemarksFor,
  refetch,
  checklistInfo,
  onChecklistSuccess,
  onChecklistCancel,
}: ChecklistRemarksDialogProps) {
  const [newRemark, setNewRemark] = useState('');
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null,
  );
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [checklistResponses, setChecklistResponses] = useState<
    Record<string, ChecklistHistoryResponseItem>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [submitChecklist] = useSubmitCandidateChecklistMutation();

  const { user } = useAppSelector((state) => state.auth || {});
  // const customFieldsContext = useContext(CustomFieldsContext);
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(
    getJobId(candidate) || '',
    { skip: !candidate.jobId },
  );

  // Parse checklist info
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

  const hasChecklist = parsedChecklistInfo?.checklist;
  const isChecklistMandatory = parsedChecklistInfo?.isMandatory ?? false;

  // Initialize checklist responses
  useEffect(() => {
    if (hasChecklist) {
      const initialResponses: Record<string, ChecklistHistoryResponseItem> = {};

      parsedChecklistInfo.checklist!.fields.forEach((field) => {
        initialResponses[field.id] = {
          value: field.type === 'checkbox' ? false : '',
          fieldLabel: field.label,
          fieldType: field.type,
          visibleInHistory: field.visibleInHistory,
        };
      });

      setChecklistResponses(initialResponses);
      setFieldErrors({}); // Clear any previous errors when initializing
      setFieldTouched({}); // Clear touched state when initializing
    }
  }, [hasChecklist, parsedChecklistInfo]);

  // Real-time validation - clear errors as soon as fields become valid
  useEffect(() => {
    if (!hasChecklist || !parsedChecklistInfo?.checklist) return;

    const currentErrors = { ...fieldErrors };
    let hasChanges = false;

    for (const field of parsedChecklistInfo.checklist.fields) {
      if (field.required && currentErrors[field.id] && fieldTouched[field.id]) {
        const response = checklistResponses[field.id];

        // Check if this field is now valid
        let isValid = false;
        if (
          response &&
          response.value !== undefined &&
          response.value !== null
        ) {
          switch (field.type) {
            case 'date':
            case 'datetime':
              // Date/datetime fields store ISO strings, check if it's a valid date string
              if (
                response.value &&
                response.value !== '' &&
                response.value !== null
              ) {
                try {
                  // Handle both string and Date object values
                  const dateObj =
                    response.value instanceof Date
                      ? response.value
                      : new Date(response.value as string);
                  isValid =
                    !Number.isNaN(dateObj.getTime()) && dateObj.getTime() > 0;
                } catch {
                  isValid = false;
                }
              }
              break;
            case 'time':
              // Time fields store time strings
              isValid =
                (response.value as boolean) &&
                response.value !== '' &&
                (response.value as string).trim() !== '';
              break;
            case 'text':
            case 'email':
            case 'textarea':
            case 'password':
              isValid = (response.value as string).trim() !== '';
              break;
            case 'number':
              isValid =
                response.value !== '' && !Number.isNaN(Number(response.value));
              break;
            case 'multiSelect':
            case 'checkbox':
              isValid =
                Array.isArray(response.value) && response.value.length > 0;
              break;
            case 'file':
              isValid =
                Array.isArray(response.value) && response.value.length > 0;
              break;
            default:
              isValid = !!response.value;
          }
        }

        if (isValid) {
          delete currentErrors[field.id];
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setFieldErrors(currentErrors);
    }
  }, [
    checklistResponses,
    fieldErrors,
    fieldTouched,
    hasChecklist,
    parsedChecklistInfo,
  ]);

  const handleChecklistFieldChange: ChecklistFieldChangeHandler = (
    fieldId,
    value,
  ) => {
    // Mark field as touched when user interacts with it
    setFieldTouched((prev) => ({ ...prev, [fieldId]: true }));

    setChecklistResponses((prev) => ({
      ...prev,
      [fieldId]: {
        value,
        fieldLabel:
          parsedChecklistInfo?.checklist?.fields.find((f) => f.id === fieldId)
            ?.label || fieldId,
        fieldType:
          parsedChecklistInfo?.checklist?.fields.find((f) => f.id === fieldId)
            ?.type || 'text',
        visibleInHistory:
          parsedChecklistInfo?.checklist?.fields.find((f) => f.id === fieldId)
            ?.visibleInHistory || [],
      },
    }));

    // Clear field error when user provides any value (more aggressive clearing)
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  };

  const validateChecklist = () => {
    if (!hasChecklist) return true;
    const checklist = parsedChecklistInfo!.checklist!;
    const errors: Record<string, string> = {};
    let hasErrors = false;

    for (const field of checklist.fields) {
      if (field.required) {
        const response = checklistResponses[field.id];
        let isEmpty = false;

        if (
          !response ||
          response.value === undefined ||
          response.value === null
        ) {
          isEmpty = true;
        } else {
          // Check emptiness based on field type
          switch (field.type) {
            case 'text':
            case 'email':
            case 'textarea':
            case 'password':
              isEmpty =
                !response.value || (response.value as string).trim() === '';
              break;
            case 'number':
              isEmpty =
                response.value === '' || Number.isNaN(Number(response.value));
              break;
            case 'date':
            case 'datetime':
              // Date/datetime fields store ISO strings, check if it's a valid date
              if (
                !response.value ||
                response.value === '' ||
                response.value === null
              ) {
                isEmpty = true;
              } else {
                try {
                  // Handle both string and Date object values
                  const dateObj =
                    response.value instanceof Date
                      ? response.value
                      : new Date(response.value as string);
                  isEmpty =
                    Number.isNaN(dateObj.getTime()) || dateObj.getTime() <= 0;
                } catch {
                  isEmpty = true;
                }
              }
              break;
            case 'time':
              // Time fields store time strings
              isEmpty =
                !response.value ||
                response.value === '' ||
                (response.value as string).trim() === '';
              break;
            case 'select':
            case 'radio':
              isEmpty = !response.value || response.value === '';
              break;
            case 'multiSelect':
            case 'checkbox':
              isEmpty =
                !Array.isArray(response.value) || response.value.length === 0;
              break;
            case 'file':
              isEmpty =
                !Array.isArray(response.value) || response.value.length === 0;
              break;
            default:
              isEmpty = !response.value;
          }
        }

        if (isEmpty) {
          errors[field.id] = `${field.label} is required`;
          hasErrors = true;
        }
      }
    }

    // Mark all required fields as touched when validation runs
    if (hasErrors) {
      const touchedState: Record<string, boolean> = {};
      for (const field of checklist.fields) {
        if (field.required) {
          touchedState[field.id] = true;
        }
      }
      setFieldTouched((prev) => ({ ...prev, ...touchedState }));
    }
    setFieldErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!validateChecklist()) return;

    setIsSubmitting(true);

    try {
      if (!user) return;
      // Submit checklist if present
      if (hasChecklist && parsedChecklistInfo) {
        const checklist = parsedChecklistInfo.checklist!;

        const laneConfig = jobLaneConfig?.laneConfigs.find(
          (lc) =>
            lc.laneId ===
            (parsedChecklistInfo.checklistType === 'incoming'
              ? parsedChecklistInfo.targetLane
              : parsedChecklistInfo.currentLane),
        );

        await submitChecklist({
          candidateId: candidate._id,
          data: {
            checklistId: checklist.id,
            checklistName: checklist.name,
            checklistType: parsedChecklistInfo.checklistType!,
            laneId:
              parsedChecklistInfo.checklistType === 'incoming'
                ? parsedChecklistInfo.targetLane
                : parsedChecklistInfo.currentLane,
            laneName: laneConfig?.laneName || '',
            responses: checklistResponses,
            remark: newRemark.trim()
              ? {
                  description: newRemark.trim(),
                  isPrivate: isSubRemarkPrivate,
                  rating: remarkRating || undefined,
                }
              : undefined,
          },
        }).unwrap();

        // Update candidate status to target lane after successful checklist submission
        const updatedCandidate = await updateCandidate({
          _id: candidate._id,
          status: parsedChecklistInfo.targetLane as CandidateStatus,
        }).unwrap();

        // Send status change email notification
        await sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: parsedChecklistInfo.currentLane,
          },
          sendStatusMail,
          {
            remark: newRemark.trim(),
            rating: remarkRating || undefined,
          },
        );
      } else if (newRemark.trim()) {
        // Only submit remark if no checklist
        const newRemarkObj = {
          description: String(newRemark).trim(),
          date: new Date().toISOString(),
          rating: remarkRating ? Number(remarkRating) : undefined,
          userId: {
            _id: user.id,
            name: user.name,
            email: user.email,
          },
        };

        const newRemarkHistoryObj = {
          description: String(newRemark).trim(),
          isPrivate: isSubRemarkPrivate,
          date: new Date().toISOString(),
          rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
          userId: {
            _id: user?.id,
            name: user?.name,
            email: user?.email,
          },
        };

        const updateData = {
          _id: candidate._id,
          name: candidate.name,
          remarks: [...(candidate.remarks || []), newRemarkObj],
        };

        const newHistoryEntry = {
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: null,
          remark: newRemarkHistoryObj,
          assignmentBy: user?.id || '',
          title: null,
          note: {
            description: '',
            date: '',
            rating: 0,
            userId: null,
          },
          attachments: [],
        };

        await updateCandidateHistory({
          candidateId: candidate._id,
          jobId: candidate.jobId,
          newEntry: newHistoryEntry,
        }).unwrap();

        const updatedCandidate = await updateCandidate(updateData).unwrap();
        await sentStatusMailHandler(updatedCandidate, sendStatusMail, {
          remark: newRemark.trim(),
          rating: remarkRating || undefined,
        });
      }

      onOpenChange(false);
      setNewRemark('');
      setRemarkRating(null);
      setRemarkRatingHistory(null);
      setOpenRemarksFor('');
      setChecklistResponses({});

      // await new Promise((resolve) => setTimeout(resolve, 100));
      await refetch();

      toast({
        title: 'Success',
        description: hasChecklist
          ? 'Checklist submitted successfully'
          : 'Remark added successfully',
      });

      // Call success callback if it's a checklist completion
      if (hasChecklist && onChecklistSuccess) {
        onChecklistSuccess(candidate._id);
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
    }
  };

  const handleCancel = () => {
    // Call cancel callback if it's a checklist cancellation
    if (hasChecklist && onChecklistCancel) {
      onChecklistCancel(candidate._id);
    }

    onOpenChange(false);
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="flex max-h-[90vh] flex-col p-0">
        <DialogHeader className="border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            {hasChecklist && <ClipboardCheck className="h-5 w-5" />}
            {hasChecklist
              ? `${parsedChecklistInfo?.checklist?.name || 'Checklist'} - ${candidate.name}`
              : `Add Remarks for ${candidate.name}`}
          </DialogTitle>
          <DialogDescription>
            {hasChecklist
              ? parsedChecklistInfo?.checklist?.description ||
                'Please complete the checklist before proceeding.'
              : 'Add your observations and feedback for this candidate.'}
          </DialogDescription>
        </DialogHeader>

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
          handleCancel={handleCancel}
          handleSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ChecklistRemarksDialog;
