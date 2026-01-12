/* eslint-disable max-lines */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import dayjs from 'dayjs';
import { Schema } from 'mongoose';
import { FormikHelpers } from 'formik';
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
} from '@/lib/features/candidate/candidateApi';
import {
  useAssignJobMutation,
  useFetchOpenJobsQuery,
} from '@/lib/features/job/jobApi';
import { useFetchInterviewersQuery } from '@/lib/features/user/userApi';
import {
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
} from '@/lib/features/calendar/calendarApi';
import { useGetGoogleCalendarConfigQuery } from '@/lib/features/settings';
import { useSendMailMutation } from '@/lib/features/org/orgApi';
import { ICandidateHistory } from '@/lib/models/history';
import { sentAssignmentMail } from '@/lib/utils';
import { Candidate } from '@/types/candidate';
import { getJobId } from '@/app/dashboard/jobs/[id]/utils/candidateAccessors';
import {
  UnifiedFormValues,
  CandidateActionType,
  ActionCheckboxes,
  UnifiedCandidateActionsDialogProps,
} from './types';

export function useCandidateActions({
  candidate,
  isOpen,
  initialAction,
  refetch,
  onUpdate,
  setLocalCandidate,
  refetchAssignment,
  onSuccess,
  onOpenChange,
}: UnifiedCandidateActionsDialogProps) {
  const { user } = useAppSelector((state) => state.auth || {});
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelMeetDialog, setShowCancelMeetDialog] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');

  // API Hooks
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [assignJob] = useAssignJobMutation();
  const [sendEmail] = useSendMailMutation();
  const [scheduleMeeting] = useScheduleMeetingMutation();
  const [updateMeeting] = useUpdateMeetingMutation();
  const [cancelMeeting, { isLoading: isCancelling }] =
    useCancelMeetingMutation();

  const { data: jobs } = useFetchOpenJobsQuery();
  const { data: googleCalendarData } =
    useGetGoogleCalendarConfigQuery(undefined);

  const shouldFetchInterviewers =
    !!user && user.role !== 'candidate' && user.role !== '';
  const { data: interviewers, refetch: refetchInterviewers } =
    useFetchInterviewersQuery(undefined, {
      skip: !shouldFetchInterviewers,
    });

  const [actionCheckboxes, setActionCheckboxes] = useState<ActionCheckboxes>({
    assignTo: initialAction === 'assignTo',
    switchJob: initialAction === 'switchJob',
    markAsDone: initialAction === 'markAsDone',
    addFollowUp: initialAction === 'addFollowUp',
    addRemark: initialAction === 'addRemark',
  });

  // Sync checkboxes with initialAction
  useEffect(() => {
    if (isOpen) {
      setActionCheckboxes({
        assignTo: initialAction === 'assignTo',
        switchJob: initialAction === 'switchJob',
        markAsDone: initialAction === 'markAsDone',
        addFollowUp: initialAction === 'addFollowUp',
        addRemark: initialAction === 'addRemark',
      });
      refetchInterviewers();
    }
  }, [isOpen, initialAction, refetchInterviewers]);

  const getInitialJobId = useCallback(() => {
    if (typeof candidate.jobId === 'string') return candidate.jobId;
    if (candidate.jobId && typeof candidate.jobId === 'object')
      return candidate.jobId._id;
    return '';
  }, [candidate.jobId]);

  const initialValues = useMemo<UnifiedFormValues>(
    () => ({
      interviewerId:
        typeof candidate.assignment?.interviewerId === 'string'
          ? candidate.assignment.interviewerId
          : candidate.assignment?.interviewerId?._id || '',
      time: candidate.assignment?.time
        ? dayjs(candidate.assignment.time)
        : null,
      scheduleGoogleMeet: !!candidate?.assignment?.googleMeet?.eventId,
      meetDuration: 60,
      meetingNotes: candidate?.assignment?.googleMeet?.meetingNotes || '',
      meetingAttachments:
        candidate?.assignment?.googleMeet?.meetingAttachments || [],
      additionalGuests: [],
      attachments: [],
      jobId: getInitialJobId(),
      followUpNote: candidate?.followUp?.note || '',
      followUpDate: candidate?.followUp?.date
        ? dayjs(candidate.followUp.date)
        : null,
      remarkDescription: '',
      remarkRating: null,
      remarkRatingHistory: null,
      isRemarkPrivate: user?.role !== 'interviewer',
      selectedMentions: [],
      removeFollowUp: false,
    }),
    [candidate, user?.role, getInitialJobId],
  );

  const toggleAction = (action: CandidateActionType, checked: boolean) => {
    setActionCheckboxes((prev) => {
      if (!checked) {
        const isOnlyCheckboxChecked =
          Object.values(prev).filter((v) => v).length === 1 && prev[action];
        if (isOnlyCheckboxChecked) {
          toast({
            title: 'Info',
            description: 'At least one action must be selected',
            variant: 'default',
          });
          return prev;
        }
      }
      const next = { ...prev, [action]: checked };
      if (action === 'markAsDone' && checked) next.assignTo = false;
      return next;
    });
  };

  const isFormValid = (values: UnifiedFormValues) => {
    const hasAnyAction = Object.values(actionCheckboxes).some((v) => v);
    if (!hasAnyAction) return false;

    if (actionCheckboxes.assignTo && !values.interviewerId) return false;
    if (actionCheckboxes.switchJob && !values.jobId) return false;
    if (
      actionCheckboxes.addFollowUp &&
      !values.followUpNote.trim() &&
      !values.followUpDate
    )
      return false;

    // Logic for Remark validation
    const hasRemarkText = !!values.remarkDescription.trim();
    if (actionCheckboxes.addRemark) {
      if (!actionCheckboxes.assignTo && !actionCheckboxes.markAsDone) {
        if (!hasRemarkText) return false;
      }
      if (
        (actionCheckboxes.markAsDone || actionCheckboxes.assignTo) &&
        !hasRemarkText
      ) {
        return false;
      }
    }

    return true;
  };

  const handleAssignTo = async (
    values: UnifiedFormValues,
    updates: Partial<Candidate>,
    historyEntries: ICandidateHistory[],
  ) => {
    if (!user) return;
    const selectedInterviewer = interviewers?.find(
      (i) => i._id === values.interviewerId,
    );
    if (!selectedInterviewer) throw new Error('Selected interviewer not found');

    let { googleMeetData } = values;
    if (values.scheduleGoogleMeet && values.time) {
      const guests = [
        ...(selectedInterviewer.email ? [selectedInterviewer.email] : []),
        ...(candidate.email ? [candidate.email] : []),
        ...(user.email && user.email !== selectedInterviewer.email
          ? [user.email]
          : []),
        ...(values.additionalGuests || []),
      ];

      const processedMeetingAttachments = await Promise.all(
        (values.meetingAttachments || []).map(async (file) => {
          if (file instanceof File) {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            return {
              id: Math.random().toString(36).slice(2),
              name: file.name,
              url: dataUrl,
              type: file.type,
              size: file.size,
            };
          }
          return file;
        }),
      );

      const isUpdating = candidate.assignment?.googleMeet?.eventId;
      const result = isUpdating
        ? await updateMeeting({
            eventId: candidate.assignment?.googleMeet?.eventId || '',
            candidateId: candidate._id,
            scheduledTime: values.time.toISOString(),
            duration: values.meetDuration || 30,
            guests,
          }).unwrap()
        : await scheduleMeeting({
            candidateId: candidate._id,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            interviewerId: selectedInterviewer._id,
            interviewerName: selectedInterviewer.name,
            scheduledTime: values.time.toISOString(),
            duration: values.meetDuration || 30,
            guests,
            jobTitle: candidate.jobId?.title || 'Position',
            organizationName: user?.organizationInfo?.name || 'Company',
            meetingNotes: values.meetingNotes || '',
            meetingAttachments: processedMeetingAttachments,
          }).unwrap();

      googleMeetData = {
        eventId: result.eventId,
        meetingLink: result.meetingLink,
        htmlLink: result.htmlLink,
        summary: result.summary,
        description: result.description,
        meetingNotes: values.meetingNotes,
        meetingAttachments: processedMeetingAttachments,
      };
    }

    const existingNames = new Set(candidate.attachments.map((a) => a.name));
    updates.attachments = [
      ...candidate.attachments,
      ...values.attachments.filter((a) => !existingNames.has(a.name)),
    ];
    updates.assignment = {
      interviewerId: values.interviewerId,
      time: values.time?.toISOString() as string,
      assignedAt: new Date().toISOString(),
      ...(googleMeetData && { googleMeet: googleMeetData }),
    };

    const previousInterviewer =
      typeof candidate?.assignment?.interviewerId === 'object' &&
      candidate?.assignment?.interviewerId?.name
        ? candidate.assignment.interviewerId.name
        : '';
    const previousInterviewerId =
      typeof candidate?.assignment?.interviewerId === 'object' &&
      candidate?.assignment?.interviewerId?._id
        ? (candidate.assignment.interviewerId
            ._id as unknown as Schema.Types.ObjectId)
        : null;

    // Fix Nested Ternary in Title
    let title = `Assigned to ${selectedInterviewer.name} : Assigned by ${user.name}`;
    if (previousInterviewer && previousInterviewer !== '') {
      title = `${previousInterviewer} → ${selectedInterviewer.name} : Assigned by ${user.name}`;
    }

    const assignmentRemark =
      actionCheckboxes.addRemark && values.remarkDescription.trim()
        ? {
            description: values.remarkDescription.trim(),
            date: new Date().toISOString(),
            rating: values.remarkRating ? Number(values.remarkRating) : 0,
            userId: { _id: user.id, name: user.name, email: user.email },
            isPrivate: values.isRemarkPrivate,
          }
        : null;

    historyEntries.push({
      dateTime: new Date().toISOString(),
      currentInterviewer:
        selectedInterviewer._id as unknown as Schema.Types.ObjectId,
      previousInterviewer: previousInterviewerId,
      assignmentBy: user.id,
      title,
      note:
        assignmentRemark ||
        ({
          description: '',
          date: '',
          rating: 0,
          userId: null,
        } as ICandidateHistory['note']),
      attachments: values.attachments,
    });
  };

  const handleSubmit = async (
    values: UnifiedFormValues,
    helpers: FormikHelpers<UnifiedFormValues>,
  ) => {
    if (!isFormValid(values)) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields.',
        variant: 'destructive',
      });
      helpers.setSubmitting(false);
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'User information is missing.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // Handle bulk operations
      if (Array.isArray(candidate)) {
        if (actionCheckboxes.switchJob && values.jobId) {
          for (const c of candidate) {
            await assignJob({
              jobId: values.jobId,
              candidateId: c._id,
            }).unwrap();
          }
          toast({
            title: 'Success',
            description: `${candidate.length} candidates assigned to job successfully`,
          });
          onSuccess?.();
          onOpenChange(false);
          return;
        }
        // Other bulk operations not implemented
        toast({
          title: 'Error',
          description: 'Bulk operations only support job switching',
          variant: 'destructive',
        });
        return;
      }

      const updates: Partial<Candidate> = {};
      const historyEntries: ICandidateHistory[] = [];

      if (actionCheckboxes.assignTo) {
        await handleAssignTo(values, updates, historyEntries);
      }

      if (actionCheckboxes.switchJob && values.jobId) {
        const already =
          candidate.jobId &&
          (typeof candidate.jobId === 'string'
            ? candidate.jobId === values.jobId
            : candidate.jobId._id === values.jobId);
        if (!already) {
          const resp = await assignJob({
            jobId: values.jobId,
            candidateId: candidate._id,
          }).unwrap();
          if (resp.updatedCandidate && onUpdate)
            onUpdate(resp.updatedCandidate);
        }
      }

      if (values.removeFollowUp) {
        updates.followUp = {
          date: null,
          note: null,
          userId: { _id: user.id, name: user.name, email: user.email },
        };
        historyEntries.push({
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: null,
          assignmentBy: user.id,
          title: 'Followup Removed',
          note: {
            description: '',
            date: '',
            rating: 0,
            userId: { _id: user.id, name: user.name, email: user.email },
          },
          attachments: [],
        });
      } else if (actionCheckboxes.addFollowUp) {
        updates.followUp = {
          note: values.followUpNote.trim(),
          date: values.followUpDate?.toISOString() || '',
          userId: { _id: user.id, name: user.name, email: user.email },
        };
        const followUpTitle =
          candidate?.followUp?.note || candidate?.followUp?.date
            ? 'Followup Updated'
            : 'Followup Created';

        historyEntries.push({
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: null,
          assignmentBy: user.id,
          title: followUpTitle,
          note: {
            description: values.followUpNote,
            date: values.followUpDate?.toISOString() || '',
            rating: 0,
            userId: null,
          },
          attachments: [],
        });
      }

      if (actionCheckboxes.markAsDone) {
        updates.assignment = null;
        const previousInterviewerId =
          typeof candidate.assignment?.interviewerId === 'object' &&
          candidate.assignment?.interviewerId?._id
            ? (candidate.assignment.interviewerId
                ._id as unknown as Schema.Types.ObjectId)
            : null;

        const markRemark =
          actionCheckboxes.addRemark && values.remarkDescription.trim()
            ? {
                description: values.remarkDescription.trim(),
                date: new Date().toISOString(),
                rating: values.remarkRating ? Number(values.remarkRating) : 0,
                userId: { _id: user.id, name: user.name, email: user.email },
                isPrivate: values.isRemarkPrivate,
              }
            : {
                description: '',
                date: '',
                rating: 0,
                userId: null,
                isPrivate: values.isRemarkPrivate,
              };

        if (actionCheckboxes.addRemark && values.remarkDescription.trim()) {
          const remark = {
            description: values.remarkDescription.trim(),
            date: new Date().toISOString(),
            rating: values.remarkRating ? Number(values.remarkRating) : 0,
            userId: { _id: user.id, name: user.name, email: user.email },
          };
          updates.remarks = [...(candidate.remarks || []), remark];
        }

        historyEntries.push({
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: previousInterviewerId,
          assignmentBy: user.id,
          title: 'Unassigned',
          note: markRemark,
          attachments: [],
        });
      }

      if (
        actionCheckboxes.addRemark &&
        values.remarkDescription.trim() &&
        !actionCheckboxes.assignTo &&
        !actionCheckboxes.markAsDone
      ) {
        const remark = {
          description: values.remarkDescription.trim(),
          date: new Date().toISOString(),
          rating: values.remarkRating ?? undefined,
          userId: { _id: user.id, name: user.name, email: user.email },
        };
        updates.remarks = [...(candidate.remarks || []), remark];

        // Fix Object literal known properties error by casting
        const historyRemark = {
          isPrivate: values.isRemarkPrivate,
          description: values.remarkDescription.trim(),
          date: new Date().toISOString(),
          rating: values.remarkRatingHistory ?? undefined,
          userId: { _id: user.id, name: user.name, email: user.email },
          selectedMentionUserIds: values.selectedMentions.map((m) => m._id),
        } as unknown as ICandidateHistory['remark'];

        historyEntries.push({
          dateTime: new Date().toISOString(),
          remark: historyRemark,
          currentInterviewer: null,
          previousInterviewer: null,
          assignmentBy: user.id,
          title: null,
          note: { description: '', date: '', rating: 0, userId: null },
          attachments: [],
        });
      }

      if (Object.keys(updates).length === 0 && historyEntries.length === 0) {
        toast({ title: 'Info', description: 'No changes to save' });
        setIsSubmitting(false);
        helpers.setSubmitting(false);
        return;
      }

      const result = await updateCandidate({
        ...candidate,
        ...updates,
      } as Candidate).unwrap();

      if (actionCheckboxes.assignTo) sentAssignmentMail(result, sendEmail);

      for (const entry of historyEntries) {
        await updateCandidateHistory({
          candidateId: candidate._id,
          jobId: getJobId(candidate) || '',
          newEntry: entry,
        }).unwrap();
      }

      // Call success callbacks and close dialog immediately
      onSuccess?.();
      toast({
        title: 'Success',
        description: 'Candidate updated successfully',
      });
      onOpenChange(false);

      // Trigger refetches in the background
      onUpdate?.(result);
      setLocalCandidate?.(result);
      if (pathname === '/dashboard') {
        refetchAssignment?.();
      }
      if (pathname !== '/dashboard' && pathname !== '/dashboard/calendar') {
        refetch?.();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error as { data?: { error?: string } }).data?.error ||
          (error as { message?: string }).message ||
          'Failed to update candidate',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      helpers.setSubmitting(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!candidate.assignment?.googleMeet?.eventId) return;
    try {
      await cancelMeeting({
        eventId: candidate.assignment.googleMeet.eventId,
        candidateId: candidate._id,
        cancelNotes,
      }).unwrap();
      toast({
        title: 'Success',
        description: 'Google Meet cancelled successfully',
      });
      if (refetch) await refetch();
      setShowCancelMeetDialog(false);
      setCancelNotes('');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to cancel Google Meet',
        variant: 'destructive',
      });
    }
  };

  return {
    state: {
      isSubmitting,
      showCancelMeetDialog,
      cancelNotes,
      actionCheckboxes,
      isCancelling,
    },
    data: {
      user,
      jobs,
      interviewers,
      googleCalendarData,
      initialValues,
    },
    handlers: {
      handleSubmit,
      handleCancelMeeting,
      setCancelNotes,
      setShowCancelMeetDialog,
      toggleAction,
    },
  };
}
