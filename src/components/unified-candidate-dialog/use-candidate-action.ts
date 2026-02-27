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
  useBulkUpdateCandidatesMutation,
  useLazyFetchCandidateDetailsQuery,
  useUploadFilesMutation,
} from '@/lib/features/candidate/candidateApi';
import {
  useAssignJobMutation,
  useBulkAssignJobMutation,
  useFetchOpenJobsQuery,
  useFetchJobLanesQuery,
} from '@/lib/features/job/jobApi';
import { useFetchInterviewersQuery } from '@/lib/features/user/userApi';
import {
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
  useScheduleZoomMeetingMutation,
  useUpdateZoomMeetingMutation,
  useCancelZoomMeetingMutation,
  useScheduleTeamsMeetingMutation,
  useUpdateTeamsMeetingMutation,
  useCancelTeamsMeetingMutation,
  MeetingAttachment,
} from '@/lib/features/calendar/calendarApi';
import {
  useGetGoogleCalendarConfigQuery,
  useGetZoomConfigQuery,
  useGetMicrosoftTeamsConfigQuery,
} from '@/lib/features/settings';
import {
  useSendMailMutation,
  useSendUnassignMailMutation,
  useSendStatusMailMutation,
} from '@/lib/features/org/orgApi';
import { ICandidateHistory } from '@/lib/models/history';
import { sentAssignmentMail, sentStatusMailHandler } from '@/lib/utils';
import { Candidate, CandidateStatus } from '@/types/candidate';
import {
  getJobId,
  getJobTitle,
} from '@/app/dashboard/jobs/[id]/utils/candidateAccessors';
import { Attachment } from '@/app/dashboard/jobs/[id]/schemas/AssignCandidateSchema';
import { uploadAttachments } from '@/app/dashboard/jobs/[id]/hooks/fileUploadUtils';
import {
  UnifiedFormValues,
  CandidateActionType,
  ActionCheckboxes,
  UnifiedCandidateActionsDialogProps,
  BulkStatusQueueItem,
} from './types';

/**
 * Normalizes interviewerId: converts empty string or "-1" to null
 * This prevents sending empty strings to the server which causes issues
 */
const normalizeInterviewerId = (
  interviewerId: string | null | undefined,
): string | null => {
  if (!interviewerId || interviewerId === '' || interviewerId === '-1') {
    return null;
  }
  return interviewerId;
};

export function useCandidateActions({
  candidate,
  candidates,
  isOpen,
  initialAction,
  refetch,
  onUpdate,
  setLocalCandidate,
  refetchAssignment,
  onSuccess,
  onOpenChange,
  onValidateStatusChange,
  onDeferStatusToChecklist,
  onOpenChecklistAfterSave,
  onBulkStatusRequiresChecklist,
}: UnifiedCandidateActionsDialogProps) {
  const isBulkMode = candidates && candidates.length > 1;
  const candidateList = isBulkMode ? candidates : [candidate];
  const { user } = useAppSelector((state) => state.auth || {});
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelMeetingProvider, setCancelMeetingProvider] = useState<
    'google' | 'zoom' | 'teams' | null
  >(null);
  const [cancelNotes, setCancelNotes] = useState('');

  // API Hooks
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [assignJob] = useAssignJobMutation();
  const [bulkAssignJob] = useBulkAssignJobMutation();
  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();
  const [fetchCandidateDetails] = useLazyFetchCandidateDetailsQuery();
  const [uploadFiles] = useUploadFilesMutation();
  const [sendEmail] = useSendMailMutation();
  const [sendUnassignEmail] = useSendUnassignMailMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [scheduleMeeting] = useScheduleMeetingMutation();
  const [updateMeeting] = useUpdateMeetingMutation();
  const [cancelMeeting, { isLoading: isCancelling }] =
    useCancelMeetingMutation();
  const [scheduleZoomMeeting] = useScheduleZoomMeetingMutation();
  const [updateZoomMeeting] = useUpdateZoomMeetingMutation();
  const [cancelZoomMeeting, { isLoading: isCancellingZoom }] =
    useCancelZoomMeetingMutation();
  const [scheduleTeamsMeeting] = useScheduleTeamsMeetingMutation();
  const [updateTeamsMeeting] = useUpdateTeamsMeetingMutation();
  const [cancelTeamsMeeting, { isLoading: isCancellingTeams }] =
    useCancelTeamsMeetingMutation();

  const { data: jobs } = useFetchOpenJobsQuery();
  const { data: googleCalendarData } =
    useGetGoogleCalendarConfigQuery(undefined);
  const { data: zoomConfigData } = useGetZoomConfigQuery(undefined);
  const { data: teamsConfigData } = useGetMicrosoftTeamsConfigQuery(undefined);

  const getInitialJobId = useCallback(() => {
    if (typeof candidate.jobId === 'string') return candidate.jobId;
    if (candidate.jobId && typeof candidate.jobId === 'object')
      return candidate.jobId._id;
    return '';
  }, [candidate.jobId]);

  const jobId = getInitialJobId();

  const shouldFetchInterviewers =
    user && (user.role === 'admin' || user.role === 'hr');

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
    updateStatus: initialAction === 'updateStatus',
  });

  const { data: jobLanesData, isLoading: isLoadingLanes } =
    useFetchJobLanesQuery(jobId, {
      skip: !jobId || !isOpen,
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
        updateStatus: initialAction === 'updateStatus',
      });
      if (shouldFetchInterviewers) {
        refetchInterviewers();
      }
    }
  }, [isOpen, initialAction, refetchInterviewers]);

  const initialValues = useMemo<UnifiedFormValues>(() => {
    // Get interviewerId, use "-1" for "None" option in Select when there's no assignment
    const interviewerIdValue =
      typeof candidate.assignment?.interviewerId === 'string'
        ? candidate.assignment.interviewerId
        : candidate.assignment?.interviewerId?._id || null;

    const scheduleGoogleMeet =
      !isBulkMode && !!candidate?.assignment?.googleMeet?.eventId;
    const meetingNotes = !isBulkMode
      ? candidate?.assignment?.googleMeet?.meetingNotes || ''
      : '';
    const meetingAttachments = !isBulkMode
      ? candidate?.assignment?.googleMeet?.meetingAttachments || []
      : [];
    const scheduleZoomMeet =
      !isBulkMode && !!candidate?.assignment?.zoomMeet?.meetingId;
    const zoomMeetingNotes = !isBulkMode
      ? candidate?.assignment?.zoomMeet?.meetingNotes || ''
      : '';
    const zoomMeetingAttachments = !isBulkMode
      ? candidate?.assignment?.zoomMeet?.meetingAttachments || []
      : [];
    const scheduleTeamsMeet =
      !isBulkMode && !!candidate?.assignment?.microsoftTeams?.meetingId;
    const teamsMeetingNotes = !isBulkMode
      ? candidate?.assignment?.microsoftTeams?.meetingNotes || ''
      : '';
    const teamsMeetingAttachments = !isBulkMode
      ? candidate?.assignment?.microsoftTeams?.meetingAttachments || []
      : [];

    return {
      interviewerId: interviewerIdValue,
      time: candidate.assignment?.time
        ? dayjs(candidate.assignment.time)
        : null,
      scheduleGoogleMeet,
      meetDuration: 60,
      meetingNotes,
      meetingAttachments,
      additionalGuests: [],
      scheduleZoomMeet,
      zoomMeetDuration: 40,
      zoomMeetingNotes,
      zoomMeetingAttachments,
      zoomAdditionalGuests: [],
      scheduleTeamsMeet,
      teamsMeetDuration: 60,
      teamsMeetingNotes,
      teamsMeetingAttachments,
      teamsAdditionalGuests: [],
      attachments: [],
      jobId,
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
      newStatus: '',
      enabledActions: {
        assignTo: initialAction === 'assignTo',
        switchJob: initialAction === 'switchJob',
        markAsDone: initialAction === 'markAsDone',
        addFollowUp: initialAction === 'addFollowUp',
        addRemark: initialAction === 'addRemark',
        updateStatus: initialAction === 'updateStatus',
      },
    };
  }, [candidate, user?.role, jobId, initialAction, isBulkMode]);

  const fetchAndHydrateCandidateDetails = useCallback(async () => {
    if (isBulkMode || !candidate?._id) return null;

    const hasLoadedRemarks =
      Array.isArray(candidate.remarks) &&
      (candidate.remarks.length > 0 || candidate.remarksCount === 0);

    if (hasLoadedRemarks) return null;

    try {
      const result = await fetchCandidateDetails(candidate._id, true);
      const details = result.data;

      if (!details || details._id !== candidate._id) return null;

      const mergedCandidate: Candidate = {
        ...candidate,
        remarks: details.remarks || [],
        remarksCount: Array.isArray(details.remarks)
          ? details.remarks.length
          : candidate.remarksCount,
        resume: details.resume ?? candidate.resume,
        attachments: details.attachments || candidate.attachments,
      };

      setLocalCandidate?.(mergedCandidate);
      return mergedCandidate;
    } catch {
      return null;
    }
  }, [isBulkMode, candidate, fetchCandidateDetails, setLocalCandidate]);

  useEffect(() => {
    if (!isOpen || isBulkMode || initialAction !== 'addRemark') {
      return undefined;
    }
    fetchAndHydrateCandidateDetails();
    return undefined;
  }, [isOpen, isBulkMode, initialAction, fetchAndHydrateCandidateDetails]);

  const toggleAction = useCallback(
    (
      action: CandidateActionType,
      checked: boolean,
      setFieldValue: (
        field: string,
        value: unknown,
        shouldValidate?: boolean,
      ) => void,
      values: UnifiedFormValues,
      setFieldTouched: (
        field: string,
        isTouched: boolean,
        shouldValidate?: boolean,
      ) => void,
    ) => {
      const currentActions = values.enabledActions;

      // "At least one" logic
      if (!checked) {
        const activeCount = Object.values(currentActions).filter(
          (v) => v === true,
        ).length;
        if (activeCount === 1 && currentActions[action]) {
          toast({
            title: 'Info',
            description: 'At least one action must be selected',
          });
          return;
        }
      }

      const nextActions = { ...currentActions, [action]: checked };

      // Mutual exclusivity
      if (action === 'markAsDone' && checked) nextActions.assignTo = false;
      if (action === 'switchJob' && checked) nextActions.updateStatus = false;
      if (action === 'updateStatus' && checked) nextActions.switchJob = false;

      if (checked) {
        if (action === 'addRemark') {
          fetchAndHydrateCandidateDetails();
        }

        const fieldsMap: Record<string, string[]> = {
          assignTo: ['interviewerId', 'time'],
          switchJob: ['jobId'],
          updateStatus: ['newStatus'],
          addFollowUp: ['followUpNote', 'followUpDate'],
          addRemark: ['remarkDescription'],
        };

        const fieldsToReset = fieldsMap[action] || [];
        fieldsToReset.forEach((field) => {
          setFieldTouched(field, false, false);
        });
      }

      setFieldValue('enabledActions', nextActions, true);
    },
    [fetchAndHydrateCandidateDetails],
  );

  const handleAssignTo = async (
    values: UnifiedFormValues,
    updates: Partial<Candidate>,
    historyEntries: ICandidateHistory[],
    uploadedAttachments: Attachment[] = [],
  ) => {
    if (!user) return;
    const selectedInterviewer = interviewers?.find(
      (i) => i._id === values.interviewerId,
    );
    if (!selectedInterviewer) throw new Error('Selected interviewer not found');

    let { googleMeetData, zoomMeetData, teamsMeetData } = values;
    const scheduleGoogle = values.scheduleGoogleMeet && values.time;
    const scheduleZoom = values.scheduleZoomMeet && values.time;
    const scheduleTeams = values.scheduleTeamsMeet && values.time;

    if (scheduleGoogle || scheduleZoom || scheduleTeams) {
      const processMeetingAttachments = async (
        files: unknown[],
      ): Promise<Attachment[]> => {
        const attachmentsToProcess: Attachment[] = await Promise.all(
          (files || []).map(async (file): Promise<Attachment> => {
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
            return file as Attachment;
          }),
        );
        // Upload meeting attachments
        return uploadAttachments({
          attachments: attachmentsToProcess,
          uploadFiles,
          organizationId: user?.organizationId as string,
        });
      };

      if (scheduleGoogle) {
        const guests = [
          ...(selectedInterviewer.email ? [selectedInterviewer.email] : []),
          ...(candidate.email ? [candidate.email] : []),
          ...(user.email && user.email !== selectedInterviewer.email
            ? [user.email]
            : []),
          ...(values.additionalGuests || []),
        ];

        const processedMeetingAttachments = await processMeetingAttachments(
          values.meetingAttachments || [],
        );

        const isUpdating = candidate.assignment?.googleMeet?.eventId;
        const result = isUpdating
          ? await updateMeeting({
              eventId: candidate.assignment?.googleMeet?.eventId || '',
              candidateId: candidate._id,
              scheduledTime: values.time?.toISOString() || '',
              duration: values.meetDuration || 30,
              guests,
              meetingNotes: values.meetingNotes || '',
              meetingAttachments:
                processedMeetingAttachments as unknown as MeetingAttachment[],
            }).unwrap()
          : await scheduleMeeting({
              candidateId: candidate._id,
              candidateName: candidate.name,
              candidateEmail: candidate.email,
              interviewerId: selectedInterviewer._id,
              interviewerName: selectedInterviewer.name,
              interviewerEmail: selectedInterviewer.email,
              scheduledTime: values.time?.toISOString() || '',
              duration: values.meetDuration || 30,
              guests,
              jobTitle: candidate.jobId?.title || 'Position',
              organizationName: user?.organizationInfo?.name || 'Company',
              meetingNotes: values.meetingNotes || '',
              meetingAttachments:
                processedMeetingAttachments as unknown as MeetingAttachment[],
            }).unwrap();

        googleMeetData = {
          eventId: result.eventId,
          meetingLink: result.meetingLink,
          htmlLink: result.htmlLink,
          summary: result.summary,
          description: result.description,
          meetingNotes: values.meetingNotes,
          meetingAttachments:
            processedMeetingAttachments as unknown as Attachment[],
        };
      }

      if (scheduleZoom) {
        const guests = [
          ...(selectedInterviewer.email ? [selectedInterviewer.email] : []),
          ...(candidate.email ? [candidate.email] : []),
          ...(user.email && user.email !== selectedInterviewer.email
            ? [user.email]
            : []),
          ...(values.zoomAdditionalGuests || []),
        ];

        const processedMeetingAttachments = await processMeetingAttachments(
          values.zoomMeetingAttachments || [],
        );

        const isUpdating = candidate.assignment?.zoomMeet?.meetingId;
        const result = isUpdating
          ? await updateZoomMeeting({
              meetingId: candidate.assignment?.zoomMeet?.meetingId || '',
              eventId: candidate.assignment?.zoomMeet?.eventId || '',
              candidateId: candidate._id,
              scheduledTime: values.time?.toISOString() || '',
              duration: values.zoomMeetDuration || 30,
              guests,
              meetingNotes: values.zoomMeetingNotes || '',
              meetingAttachments:
                processedMeetingAttachments as unknown as MeetingAttachment[],
            }).unwrap()
          : await scheduleZoomMeeting({
              candidateId: candidate._id,
              candidateName: candidate.name,
              candidateEmail: candidate.email,
              interviewerId: selectedInterviewer._id,
              interviewerName: selectedInterviewer.name,
              interviewerEmail: selectedInterviewer.email,
              scheduledTime: values.time?.toISOString() || '',
              duration: values.zoomMeetDuration || 30,
              guests,
              jobTitle: candidate.jobId?.title || 'Position',
              organizationName: user?.organizationInfo?.name || 'Company',
              meetingNotes: values.zoomMeetingNotes || '',
              meetingAttachments:
                processedMeetingAttachments as unknown as MeetingAttachment[],
            }).unwrap();

        zoomMeetData = {
          meetingId: result.meetingId,
          meetingLink: result.meetingLink,
          startUrl: result.startUrl,
          eventId: result.eventId,
          htmlLink: result.htmlLink,
          summary: result.summary,
          description: result.description,
          meetingNotes: values.zoomMeetingNotes,
          meetingAttachments:
            processedMeetingAttachments as unknown as Attachment[],
        };
      }

      if (scheduleTeams) {
        const guests = [
          ...(selectedInterviewer.email ? [selectedInterviewer.email] : []),
          ...(candidate.email ? [candidate.email] : []),
          ...(user.email && user.email !== selectedInterviewer.email
            ? [user.email]
            : []),
          ...(values.teamsAdditionalGuests || []),
        ];

        const processedMeetingAttachments = await processMeetingAttachments(
          values.teamsMeetingAttachments || [],
        );

        const isUpdating = candidate.assignment?.microsoftTeams?.meetingId;
        const result = isUpdating
          ? await updateTeamsMeeting({
              meetingId: candidate.assignment?.microsoftTeams?.meetingId || '',
              eventId: candidate.assignment?.microsoftTeams?.eventId || '',
              candidateId: candidate._id,
              scheduledTime: values.time?.toISOString() || '',
              duration: values.teamsMeetDuration || 30,
              guests,
              meetingNotes: values.teamsMeetingNotes || '',
              meetingAttachments:
                processedMeetingAttachments as unknown as MeetingAttachment[],
            }).unwrap()
          : await scheduleTeamsMeeting({
              candidateId: candidate._id,
              candidateName: candidate.name,
              candidateEmail: candidate.email,
              interviewerId: selectedInterviewer._id,
              interviewerName: selectedInterviewer.name,
              interviewerEmail: selectedInterviewer.email,
              scheduledTime: values.time?.toISOString() || '',
              duration: values.teamsMeetDuration || 30,
              guests,
              jobTitle: candidate.jobId?.title || 'Position',
              organizationName: user?.organizationInfo?.name || 'Company',
              meetingNotes: values.teamsMeetingNotes || '',
              meetingAttachments:
                processedMeetingAttachments as unknown as MeetingAttachment[],
            }).unwrap();

        teamsMeetData = {
          meetingId: result.meetingId,
          meetingLink: result.meetingLink,
          eventId: result.eventId,
          htmlLink: result.htmlLink,
          summary: result.summary,
          description: result.description,
          meetingNotes: values.teamsMeetingNotes,
          meetingAttachments:
            processedMeetingAttachments as unknown as Attachment[],
        };
      }
    }

    // Use uploaded attachments (passed from handleSubmit)
    const existingNames = new Set(candidate.attachments.map((a) => a.name));
    const attachmentsToUse =
      uploadedAttachments.length > 0
        ? uploadedAttachments
        : values.attachments || [];
    updates.attachments = [
      ...candidate.attachments,
      ...attachmentsToUse.filter((a) => !existingNames.has(a.name)),
    ];
    // Normalize interviewerId: convert empty string or "-1" to null
    const normalizedInterviewerId = normalizeInterviewerId(
      values.interviewerId as string | null | undefined,
    );
    updates.assignment = {
      interviewerId: normalizedInterviewerId,
      // Explicitly set time to null if values.time is null/undefined, otherwise convert to ISO string
      time: values.time ? (values.time.toISOString() as string) : '',
      assignedAt: new Date().toISOString(),
      ...(googleMeetData && { googleMeet: googleMeetData }),
      ...(zoomMeetData && { zoomMeet: zoomMeetData }),
      ...(teamsMeetData && { microsoftTeams: teamsMeetData }),
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

    const meetingLinkLines: string[] = [];
    if (scheduleGoogle && googleMeetData?.meetingLink) {
      meetingLinkLines.push(
        `Google Meet meeting link: ${googleMeetData.meetingLink}`,
      );
    }
    if (scheduleZoom && zoomMeetData?.meetingLink) {
      meetingLinkLines.push(`Zoom meeting link: ${zoomMeetData.meetingLink}`);
    }
    if (scheduleTeams && teamsMeetData?.meetingLink) {
      meetingLinkLines.push(
        `Microsoft Teams meeting link: ${teamsMeetData.meetingLink}`,
      );
    }
    const meetingLinkNote = meetingLinkLines.join('\n');

    const assignmentRemark =
      values.enabledActions.addRemark && values.remarkDescription.trim()
        ? {
            description: values.remarkDescription.trim(),
            date: new Date().toISOString(),
            rating: values.remarkRating ? Number(values.remarkRating) : 0,
            userId: { _id: user.id, name: user.name, email: user.email },
            isPrivate: values.isRemarkPrivate,
          }
        : null;

    const baseDescription = assignmentRemark?.description || '';
    const noteDescription =
      baseDescription && meetingLinkNote
        ? `${baseDescription}\n\n${meetingLinkNote}`
        : baseDescription || meetingLinkNote;

    historyEntries.push({
      dateTime: new Date().toISOString(),
      currentInterviewer:
        selectedInterviewer._id as unknown as Schema.Types.ObjectId,
      previousInterviewer: previousInterviewerId,
      assignmentBy: user.id,
      title,
      note: assignmentRemark
        ? {
            ...assignmentRemark,
            description: noteDescription,
          }
        : ({
            description: noteDescription,
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
    const actions = values.enabledActions;

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
      // Upload regular attachments first if any
      let uploadedAttachments = values.attachments || [];
      if (uploadedAttachments.length > 0) {
        try {
          uploadedAttachments = await uploadAttachments({
            attachments: uploadedAttachments,
            uploadFiles,
            organizationId: user?.organizationId as string,
          });
        } catch {
          toast({
            title: 'Upload Error',
            description: 'Failed to upload some attachments. Please try again.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Handle bulk operations via unified bulk-update API (supports multiple operations)
      if (isBulkMode && candidateList.length > 1) {
        const candidateIds = candidateList.map((c) => c._id);
        const operations: Array<{
          operation: string;
          [key: string]: unknown;
        }> = [];

        // Build operations array from enabled actions
        // Note: switchJob uses separate API (bulkAssignJob) for now, but could be added to bulk-update later
        if (actions.switchJob && values.jobId) {
          try {
            const result = await bulkAssignJob({
              jobId: values.jobId,
              candidateIds,
            }).unwrap();
            const count =
              result?.updatedCandidates?.length ?? candidateIds.length;
            toast({
              title: 'Success',
              description: `${count} candidate(s) moved to job`,
            });
            onSuccess?.();
            onOpenChange(false);
          } catch (error) {
            toast({
              title: 'Error',
              description:
                (error as { data?: { error?: string } })?.data?.error ||
                (error as Error)?.message ||
                'Failed to move candidates',
              variant: 'destructive',
            });
          }
          setIsSubmitting(false);
          return;
        }

        // Bulk Assign To
        if (actions.assignTo && values.interviewerId) {
          const normalizedInterviewerId = normalizeInterviewerId(
            values.interviewerId as string | null | undefined,
          );
          if (!normalizedInterviewerId) {
            toast({
              title: 'Error',
              description: 'Please select an interviewer',
              variant: 'destructive',
            });
            setIsSubmitting(false);
            return;
          }

          // Process meeting attachments - convert File to Attachment format, then upload
          const meetingAttachmentsToProcess: Attachment[] = await Promise.all(
            (values.meetingAttachments || []).map(
              async (file): Promise<Attachment> => {
                if (file instanceof File) {
                  const reader = new FileReader();
                  const dataUrl = await new Promise<string>(
                    (resolve, reject) => {
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                    },
                  );
                  return {
                    id: Math.random().toString(36).slice(2),
                    name: file.name,
                    url: dataUrl,
                    type: file.type,
                    size: file.size,
                  };
                }
                return file as Attachment;
              },
            ),
          );
          const processedMeetingAttachments = await uploadAttachments({
            attachments: meetingAttachmentsToProcess,
            uploadFiles,
            organizationId: user?.organizationId as string,
          });

          const zoomMeetingAttachmentsToProcess: Attachment[] =
            await Promise.all(
              (values.zoomMeetingAttachments || []).map(
                async (file): Promise<Attachment> => {
                  if (file instanceof File) {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>(
                      (resolve, reject) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      },
                    );
                    return {
                      id: Math.random().toString(36).slice(2),
                      name: file.name,
                      url: dataUrl,
                      type: file.type,
                      size: file.size,
                    };
                  }
                  return file as Attachment;
                },
              ),
            );
          const processedZoomMeetingAttachments = await uploadAttachments({
            attachments: zoomMeetingAttachmentsToProcess,
            uploadFiles,
            organizationId: user?.organizationId as string,
          });

          operations.push({
            operation: 'assign',
            interviewerId: normalizedInterviewerId,
            time: values.time ? values.time.toISOString() : undefined,
            attachments: uploadedAttachments,
            scheduleGoogleMeet: values.scheduleGoogleMeet || false,
            meetDuration: values.meetDuration || 30,
            meetingNotes: values.meetingNotes || '',
            meetingAttachments: processedMeetingAttachments,
            additionalGuests: values.additionalGuests || [],
            scheduleZoomMeet: values.scheduleZoomMeet || false,
            zoomMeetDuration: values.zoomMeetDuration || 30,
            zoomMeetingNotes: values.zoomMeetingNotes || '',
            zoomMeetingAttachments: processedZoomMeetingAttachments,
            zoomAdditionalGuests: values.zoomAdditionalGuests || [],
          });
        }

        // Bulk Mark as Done
        if (actions.markAsDone) {
          operations.push({
            operation: 'unassign',
          });
        }

        // Bulk Add Remark
        if (actions.addRemark && values.remarkDescription?.trim()) {
          operations.push({
            operation: 'addRemark',
            description: values.remarkDescription.trim(),
            isPrivate: values.isRemarkPrivate,
            rating: values.remarkRating ? Number(values.remarkRating) : 0,
            selectedMentionUserIds:
              values.selectedMentions?.map((m) => m._id) ?? [],
          });
        }

        // Bulk Follow-up (remove or add)
        if (actions.addFollowUp && values.removeFollowUp) {
          operations.push({
            operation: 'removeFollowUp',
          });
        } else if (actions.addFollowUp && values.followUpNote?.trim()) {
          operations.push({
            operation: 'addFollowUp',
            note: values.followUpNote.trim(),
            date: values.followUpDate?.toISOString() ?? null,
          });
        }

        // Bulk Status Update: build queue; if any require checklist, defer to checklist flow (one-by-one)
        if (actions.updateStatus && values.newStatus) {
          const newStatus = values.newStatus as string;
          if (onValidateStatusChange && onBulkStatusRequiresChecklist) {
            const queue: BulkStatusQueueItem[] = candidateList
              .filter((c) => c.status !== newStatus)
              .flatMap((c) => {
                const validation = onValidateStatusChange(c, newStatus);
                if (!validation?.requiresChecklist) return [];
                if (validation.validationSteps?.length) {
                  // Ensure outgoing step(s) come before incoming so bulk flow opens outgoing first
                  const steps = validation.validationSteps
                    .slice()
                    .sort((a, b) => {
                      let aOut = false;
                      let bOut = false;
                      try {
                        aOut =
                          (
                            JSON.parse(a.validationInfo) as {
                              checklistType?: string;
                            }
                          ).checklistType === 'outgoing';
                      } catch {
                        /* ignore */
                      }
                      try {
                        bOut =
                          (
                            JSON.parse(b.validationInfo) as {
                              checklistType?: string;
                            }
                          ).checklistType === 'outgoing';
                      } catch {
                        /* ignore */
                      }
                      if (aOut && !bOut) return -1;
                      if (!aOut && bOut) return 1;
                      return 0;
                    });
                  return steps.map((s) => ({
                    candidateId: c._id,
                    newStatus: s.newStatusAfterStep,
                    validationInfo: s.validationInfo,
                  }));
                }
                return [
                  {
                    candidateId: c._id,
                    newStatus,
                    validationInfo: validation.validationInfo!,
                  },
                ];
              });
            const anyRequiresChecklist = queue.some(
              (item) => item.validationInfo != null,
            );
            if (queue.length > 0 && anyRequiresChecklist) {
              onBulkStatusRequiresChecklist(queue);
              onOpenChange(false);
              setIsSubmitting(false);
              return;
            }
          }
          operations.push({
            operation: 'statusUpdate',
            status: newStatus,
          });
        }

        if (operations.length === 0) {
          toast({
            title: 'Info',
            description: 'Please select an action to perform',
          });
          setIsSubmitting(false);
          return;
        }

        // Send all operations in a single request
        try {
          const result = await bulkUpdateCandidates({
            candidateIds,
            operations:
              operations as unknown as import('@/app/api/candidates/bulk-update/types').BulkUpdateOperationParams[],
          }).unwrap();
          toast({
            title: 'Success',
            description:
              result.message || `Updated ${result.updatedCount} candidate(s)`,
          });
          onSuccess?.();
          onOpenChange(false);
        } catch (error) {
          toast({
            title: 'Error',
            description:
              (error as { data?: { error?: string } })?.data?.error ||
              (error as Error)?.message ||
              'Failed to update candidates',
            variant: 'destructive',
          });
        }
        setIsSubmitting(false);
        return;
      }

      const updates: Partial<Candidate> = {};
      const historyEntries: ICandidateHistory[] = [];
      let candidateWithDetailsForRemark = candidate;

      if (!isBulkMode && actions.addRemark) {
        const hydratedCandidate = await fetchAndHydrateCandidateDetails();
        if (hydratedCandidate) {
          candidateWithDetailsForRemark = hydratedCandidate;
        }
      }

      const existingRemarks = candidateWithDetailsForRemark.remarks || [];

      if (actions.assignTo) {
        await handleAssignTo(
          values,
          updates,
          historyEntries,
          uploadedAttachments,
        );
      }

      if (actions.switchJob && values.jobId) {
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
        if (candidate.status !== 'applied') {
          updates.status = 'applied';
        }
      }

      // Single-candidate status update: run validation whenever user selected a different status
      // (so checklist is shown even if they did not check "Update status"). Only apply status
      // when checklist not required and they checked the box.
      let deferredStatusChecklist: {
        validationInfo: string;
        newStatus: string;
        nextChecklistValidationInfo?: string;
      } | null = null;
      let openChecklistAfterSaveInfo: string | null = null;
      const hasStatusChange =
        values.newStatus && values.newStatus !== candidate.status;
      if (hasStatusChange) {
        if (
          onValidateStatusChange &&
          (onDeferStatusToChecklist || onOpenChecklistAfterSave)
        ) {
          const validation = onValidateStatusChange(
            candidate,
            values.newStatus as string,
          );
          // Contract: validationSteps[0] = outgoing, [1] = incoming. When both exist, open outgoing first (by checklistType).
          const steps = validation?.validationSteps;
          const firstStepInfo =
            steps && steps.length >= 2
              ? (() => {
                  const outgoingStep = steps.find((s) => {
                    try {
                      const p = JSON.parse(s.validationInfo) as {
                        checklistType?: string;
                      };
                      return p.checklistType === 'outgoing';
                    } catch {
                      return false;
                    }
                  });
                  return (
                    outgoingStep?.validationInfo ?? steps[0].validationInfo
                  );
                })()
              : (validation?.validationInfo ?? steps?.[0]?.validationInfo);
          const secondStepInfo =
            steps && steps.length >= 2
              ? (() => {
                  const incomingStep = steps.find((s) => {
                    try {
                      const p = JSON.parse(s.validationInfo) as {
                        checklistType?: string;
                      };
                      return p.checklistType === 'incoming';
                    } catch {
                      return false;
                    }
                  });
                  return (
                    incomingStep?.validationInfo ?? steps[1].validationInfo
                  );
                })()
              : undefined;
          // Guarantee we never pass incoming first when both exist (fallback steps[0] can be wrong order).
          let validationInfoToUse = firstStepInfo;
          let nextChecklistValidationInfoToUse = secondStepInfo;
          if (steps && steps.length >= 2 && firstStepInfo && secondStepInfo) {
            let firstType: string | undefined;
            let secondType: string | undefined;
            try {
              firstType = (
                JSON.parse(firstStepInfo) as { checklistType?: string }
              ).checklistType;
            } catch {
              firstType = undefined;
            }
            try {
              secondType = (
                JSON.parse(secondStepInfo) as { checklistType?: string }
              ).checklistType;
            } catch {
              secondType = undefined;
            }
            if (firstType === 'incoming' && secondType === 'outgoing') {
              validationInfoToUse = secondStepInfo;
              nextChecklistValidationInfoToUse = firstStepInfo;
            }
          }
          const validationInfoToUseFinal = validationInfoToUse;
          if (validation?.requiresChecklist && validationInfoToUseFinal) {
            const isMandatory = validation.isMandatory === true;
            if (isMandatory && onDeferStatusToChecklist) {
              deferredStatusChecklist = {
                validationInfo: validationInfoToUseFinal,
                newStatus: values.newStatus as string,
                ...(nextChecklistValidationInfoToUse
                  ? {
                      nextChecklistValidationInfo:
                        nextChecklistValidationInfoToUse,
                    }
                  : {}),
              };
            } else if (!isMandatory) {
              if (actions.updateStatus) {
                updates.status = values.newStatus as CandidateStatus;
              }
              if (onOpenChecklistAfterSave) {
                openChecklistAfterSaveInfo = validationInfoToUseFinal;
              } else if (onDeferStatusToChecklist) {
                deferredStatusChecklist = {
                  validationInfo: validationInfoToUseFinal,
                  newStatus: values.newStatus as string,
                  ...(nextChecklistValidationInfoToUse
                    ? {
                        nextChecklistValidationInfo:
                          nextChecklistValidationInfoToUse,
                      }
                    : {}),
                };
              }
            }
          } else if (actions.updateStatus) {
            updates.status = values.newStatus as CandidateStatus;
          }
        } else if (actions.updateStatus) {
          updates.status = values.newStatus as CandidateStatus;
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
      } else if (actions.addFollowUp) {
        updates.followUp = {
          note: values.followUpNote.trim(),
          date: values.followUpDate?.toISOString() || null,
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

      if (actions.markAsDone) {
        updates.assignment = null;
        const previousInterviewerId =
          typeof candidate.assignment?.interviewerId === 'object' &&
          candidate.assignment?.interviewerId?._id
            ? (candidate.assignment.interviewerId
                ._id as unknown as Schema.Types.ObjectId)
            : null;

        const markRemark =
          actions.addRemark && values.remarkDescription.trim()
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

        if (actions.addRemark && values.remarkDescription.trim()) {
          const remark = {
            description: values.remarkDescription.trim(),
            date: new Date().toISOString(),
            rating: values.remarkRating ? Number(values.remarkRating) : 0,
            userId: { _id: user.id, name: user.name, email: user.email },
          };
          updates.remarks = [...existingRemarks, remark];
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
        actions.addRemark &&
        values.remarkDescription.trim() &&
        !actions.assignTo &&
        !actions.markAsDone
      ) {
        const remark = {
          description: values.remarkDescription.trim(),
          date: new Date().toISOString(),
          rating: values.remarkRating ?? undefined,
          userId: { _id: user.id, name: user.name, email: user.email },
        };
        updates.remarks = [...existingRemarks, remark];

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
        if (deferredStatusChecklist) {
          onDeferStatusToChecklist?.(
            deferredStatusChecklist.validationInfo,
            deferredStatusChecklist.newStatus,
            deferredStatusChecklist.nextChecklistValidationInfo,
          );
          onOpenChange(false);
        } else if (openChecklistAfterSaveInfo && onOpenChecklistAfterSave) {
          onOpenChecklistAfterSave(openChecklistAfterSaveInfo);
          onOpenChange(false);
        } else {
          toast({ title: 'Info', description: 'No changes to save' });
          onOpenChange(false);
        }
        setIsSubmitting(false);
        helpers.setSubmitting(false);
        return;
      }

      const finalCandidatePayload = {
        ...candidateWithDetailsForRemark,
        ...updates,
      };

      if (
        finalCandidatePayload.assignment &&
        typeof finalCandidatePayload.assignment === 'object' &&
        Object.keys(finalCandidatePayload.assignment).length === 0
      ) {
        finalCandidatePayload.assignment = null;
      }

      const result = await updateCandidate(
        finalCandidatePayload as Candidate,
      ).unwrap();

      if (actions.assignTo) sentAssignmentMail(result, sendEmail);

      if (
        !deferredStatusChecklist &&
        actions.updateStatus &&
        values.newStatus &&
        values.newStatus !== candidate.status
      ) {
        // Status was applied in this request (either no checklist or optional checklist)
        sentStatusMailHandler(
          { ...result, prev_status: candidate.status },
          sendStatusMail,
          {
            remark: actions.addRemark ? values.remarkDescription : '',
            rating: actions.addRemark ? (values.remarkRating as number) : 0,
          },
        );
      }

      for (const entry of historyEntries) {
        await updateCandidateHistory({
          candidateId: candidate._id,
          jobId: candidate.jobId || getJobId(candidate) || '',
          newEntry: entry,
        }).unwrap();
      }

      // If status was deferred to mandatory checklist, open checklist dialog and exit (parent will switch view)
      if (deferredStatusChecklist) {
        onDeferStatusToChecklist?.(
          deferredStatusChecklist.validationInfo,
          deferredStatusChecklist.newStatus,
          deferredStatusChecklist.nextChecklistValidationInfo,
        );
        onOpenChange(false);
        setIsSubmitting(false);
        helpers.setSubmitting(false);
        return;
      }

      // Send step completed email when marking as done
      if (actions.markAsDone) {
        const markAsDoneEntry = historyEntries.find(
          (entry) => entry.title === 'Unassigned',
        );
        const feedback = markAsDoneEntry?.note
          ? {
              description: markAsDoneEntry.note.description || '',
              rating:
                typeof markAsDoneEntry.note.rating === 'number'
                  ? markAsDoneEntry.note.rating
                  : undefined,
            }
          : undefined;

        try {
          await sendUnassignEmail({
            name: result.name,
            candidateId: candidate._id,
            jobId: getJobId(candidate) || undefined,
            title: getJobTitle(candidate) || undefined,
            dateTime: new Date().toISOString(),
            status: result.status || candidate.status,
            feedback,
          }).unwrap();
        } catch (_emailError) {
          // Silently fail email sending - candidate update was successful
          // Error is logged on the backend if email sending fails
        }
      }

      // Call success callbacks and close dialog immediately
      onSuccess?.();
      toast({
        title: 'Success',
        description: 'Candidate updated successfully',
      });
      onOpenChange(false);

      // Update local state with the result - no need to refetch individual candidate
      // since we already have the updated data from the mutation
      // IMPORTANT: When we have history entries to add, strip the stale history from result
      // The updateCandidateHistory call happens AFTER updateCandidate, so the history in result
      // is stale (missing the new entries). Stripping it ensures the details dialog will
      // fetch fresh history instead of using stale data and marking historyLoaded=true prematurely.
      if (historyEntries.length > 0) {
        const { history: _staleHistory, ...resultWithoutHistory } =
          result as Candidate & { history?: unknown };
        onUpdate?.(resultWithoutHistory as Candidate);
        setLocalCandidate?.(resultWithoutHistory as Candidate);
      } else {
        onUpdate?.(result);
        setLocalCandidate?.(result);
      }

      // Only refetch assignments list for dashboard (to update the list view)
      // Don't refetch individual candidate since we already have the updated result
      if (pathname === '/dashboard' && !actions.markAsDone) {
        refetchAssignment?.();
      }

      // Open optional checklist form after save (status already applied)
      if (openChecklistAfterSaveInfo && onOpenChecklistAfterSave) {
        onOpenChecklistAfterSave(openChecklistAfterSaveInfo);
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
    try {
      if (cancelMeetingProvider === 'google') {
        if (!candidate.assignment?.googleMeet?.eventId) return;
        await cancelMeeting({
          eventId: candidate.assignment.googleMeet.eventId,
          candidateId: candidate._id,
          cancelNotes,
        }).unwrap();
        toast({
          title: 'Success',
          description: 'Google Meet cancelled successfully',
        });
      }

      if (cancelMeetingProvider === 'zoom') {
        if (!candidate.assignment?.zoomMeet?.meetingId) return;
        const interviewerEmail =
          candidate.assignment?.interviewerId &&
          typeof candidate.assignment.interviewerId !== 'string'
            ? candidate.assignment.interviewerId.email || ''
            : '';
        const guests = Array.from(
          new Set(
            [
              ...(candidate.assignment.zoomMeet.guestEmails || []),
              candidate.email || '',
              interviewerEmail,
            ].filter(Boolean),
          ),
        );

        await cancelZoomMeeting({
          meetingId: candidate.assignment.zoomMeet.meetingId,
          eventId: candidate.assignment.zoomMeet.eventId || '',
          candidateId: candidate._id,
          cancelNotes,
          guests,
        }).unwrap();
        toast({
          title: 'Success',
          description: 'Zoom meeting cancelled successfully',
          variant: 'default',
        });
      } else if (cancelMeetingProvider === 'teams') {
        if (!candidate.assignment?.microsoftTeams?.meetingId) return;
        await cancelTeamsMeeting({
          meetingId: candidate.assignment.microsoftTeams.meetingId,
          eventId: candidate.assignment.microsoftTeams.eventId || '',
          candidateId: candidate._id,
          cancelNotes,
        }).unwrap();
        toast({
          title: 'Success',
          description: 'Microsoft Teams meeting cancelled successfully',
        });
      }

      if (refetch) await refetch();
      setCancelMeetingProvider(null);
      setCancelNotes('');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to cancel meeting',
        variant: 'destructive',
      });
    }
  };

  const showCancelMeetDialog = cancelMeetingProvider !== null;
  const getIsCancellingActive = () => {
    if (cancelMeetingProvider === 'zoom') return isCancellingZoom;
    if (cancelMeetingProvider === 'teams') return isCancellingTeams;
    return isCancelling;
  };

  const isCancellingActive = getIsCancellingActive();

  return {
    state: {
      isSubmitting,
      showCancelMeetDialog,
      cancelNotes,
      actionCheckboxes,
      isCancelling: isCancellingActive,
      cancelMeetingProvider,
    },
    data: {
      user,
      jobs,
      interviewers,
      googleCalendarData,
      zoomConfigData,
      teamsConfigData,
      initialValues,
      jobLanesData,
      isLoadingLanes,
    },
    handlers: {
      handleSubmit,
      handleCancelMeeting,
      setCancelNotes,
      setCancelMeetingProvider,
      toggleAction,
    },
  };
}
