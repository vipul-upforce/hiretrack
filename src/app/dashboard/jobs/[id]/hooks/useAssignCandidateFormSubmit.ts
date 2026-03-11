'use client';

import { FormikHelpers } from 'formik';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/lib/redux/hooks';
import logger from '@/lib/logger';
import {
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
  useScheduleZoomMeetingMutation,
  useUpdateZoomMeetingMutation,
  useScheduleTeamsMeetingMutation,
  useUpdateTeamsMeetingMutation,
} from '@/lib/features/calendar/calendarApi';
import { useUploadFilesMutation } from '@/lib/features/candidate/candidateApi';
import { Interviewer } from '@/lib/features/user/userApi';
import { Candidate } from '@/types/candidate';
import { FormValues, Attachment } from '../schemas/AssignCandidateSchema';
import { uploadAttachments } from './fileUploadUtils';

type HandleSubmitFn = (
  values: FormValues,
  formikHelpers: FormikHelpers<FormValues>,
  interviewers: Interviewer[] | undefined,
) => Promise<void>;

interface UseAssignCandidateFormSubmitParams {
  candidate: Candidate;
  handleSubmit: HandleSubmitFn;
  refetch: () => Promise<void>;
}

/**
 * Encapsulates assign-candidate form submit: uploads attachments,
 * schedules/updates Google/Zoom/Teams meetings, then calls handleSubmit with merged values.
 */
export function useAssignCandidateFormSubmit({
  candidate,
  handleSubmit,
  refetch,
}: UseAssignCandidateFormSubmitParams) {
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);

  const [scheduleMeeting] = useScheduleMeetingMutation();
  const [updateMeeting] = useUpdateMeetingMutation();
  const [scheduleZoomMeeting] = useScheduleZoomMeetingMutation();
  const [updateZoomMeeting] = useUpdateZoomMeetingMutation();
  const [scheduleTeamsMeeting] = useScheduleTeamsMeetingMutation();
  const [updateTeamsMeeting] = useUpdateTeamsMeetingMutation();
  const [uploadFiles] = useUploadFilesMutation();

  const getDefaultGuests = (selectedInterviewer: Interviewer) => {
    const defaultGuests = [];
    if (selectedInterviewer?.email)
      defaultGuests.push(selectedInterviewer.email);
    if (candidate.email) defaultGuests.push(candidate.email);
    if (user?.email && user.email !== selectedInterviewer?.email) {
      defaultGuests.push(user.email);
    }
    return defaultGuests;
  };

  const handleFormSubmit = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>,
    interviewers: Interviewer[] | undefined,
  ) => {
    const scheduleGoogle = values.scheduleGoogleMeet && values.time;
    const scheduleZoom = values.scheduleZoomMeet && values.time;
    const scheduleTeams = values.scheduleTeamsMeet && values.time;

    let uploadedAttachments = values.attachments || [];
    if (uploadedAttachments.length > 0) {
      try {
        uploadedAttachments = await uploadAttachments({
          attachments: uploadedAttachments,
          uploadFiles,
          organizationId: user?.organizationId as string,
        });
      } catch (error) {
        logger.error('Failed to upload attachments:', error);
        toast({
          title: 'Upload Error',
          description: 'Failed to upload some attachments. Please try again.',
          variant: 'destructive',
        });
        formikHelpers.setSubmitting(false);
        return;
      }
    }

    if (scheduleGoogle || scheduleZoom || scheduleTeams) {
      try {
        const selectedInterviewer = interviewers?.find(
          (i) => i._id === values.interviewerId,
        );

        if (!selectedInterviewer) {
          toast({
            title: 'Error',
            description: 'Selected interviewer not found',
            variant: 'destructive',
          });
          formikHelpers.setSubmitting(false);
          return;
        }

        const processAttachments = async (
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
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name,
                  url: dataUrl,
                  type: file.type,
                  size: file.size,
                };
              }
              const existing = file as Attachment;
              return {
                ...existing,
                id: existing.id ?? Math.random().toString(36).substr(2, 9),
              };
            }),
          );
          return uploadAttachments({
            attachments: attachmentsToProcess,
            uploadFiles,
            organizationId: user?.organizationId as string,
          });
        };

        const defaultGuests = getDefaultGuests(selectedInterviewer);
        const googleGuests = [
          ...defaultGuests,
          ...(values.additionalGuests || []),
        ];
        const zoomGuests = [
          ...defaultGuests,
          ...(values.zoomAdditionalGuests || []),
        ];
        const teamsGuests = [
          ...defaultGuests,
          ...((values as { teamsAdditionalGuests?: string[] })
            .teamsAdditionalGuests || []),
        ];

        let googleResult;
        let zoomResult;
        let teamsResult;
        let processedGoogleAttachments: Attachment[] = [];
        let processedZoomAttachments: Attachment[] = [];
        let processedTeamsAttachments: Attachment[] = [];

        if (scheduleGoogle) {
          processedGoogleAttachments = (await processAttachments(
            values.meetingAttachments || [],
          )) as Attachment[];

          const isUpdatingGoogle = candidate.assignment?.googleMeet?.eventId;

          googleResult = isUpdatingGoogle
            ? await updateMeeting({
                eventId: candidate.assignment?.googleMeet?.eventId || '',
                candidateId: candidate._id,
                scheduledTime: values.time?.toISOString() ?? '',
                duration: values.meetDuration || 30,
                guests: googleGuests,
              }).unwrap()
            : await scheduleMeeting({
                candidateId: candidate._id,
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                interviewerId: selectedInterviewer._id,
                interviewerName: selectedInterviewer.name,
                interviewerEmail: selectedInterviewer.email,
                scheduledTime: values.time?.toISOString() ?? '',
                duration: values.meetDuration || 30,
                guests: googleGuests,
                jobTitle: candidate.jobId?.title || 'Position',
                organizationName: user?.organizationInfo?.name || 'Company',
                meetingNotes: values.meetingNotes || '',
                meetingAttachments: processedGoogleAttachments,
              }).unwrap();
        }

        if (scheduleZoom) {
          processedZoomAttachments = (await processAttachments(
            values.zoomMeetingAttachments || [],
          )) as Attachment[];

          const isUpdatingZoom = candidate.assignment?.zoomMeet?.meetingId;

          zoomResult = isUpdatingZoom
            ? await updateZoomMeeting({
                meetingId: candidate.assignment?.zoomMeet?.meetingId || '',
                eventId: candidate.assignment?.zoomMeet?.eventId || '',
                candidateId: candidate._id,
                scheduledTime: values.time?.toISOString() ?? '',
                duration: values.zoomMeetDuration || 30,
                guests: zoomGuests,
              }).unwrap()
            : await scheduleZoomMeeting({
                candidateId: candidate._id,
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                interviewerId: selectedInterviewer._id,
                interviewerName: selectedInterviewer.name,
                interviewerEmail: selectedInterviewer.email,
                scheduledTime: values.time?.toISOString() ?? '',
                duration: values.zoomMeetDuration || 30,
                guests: zoomGuests,
                jobTitle: candidate.jobId?.title || 'Position',
                organizationName: user?.organizationInfo?.name || 'Company',
                meetingNotes: values.zoomMeetingNotes || '',
                meetingAttachments: processedZoomAttachments,
              }).unwrap();
        }

        if (scheduleTeams) {
          processedTeamsAttachments = await processAttachments(
            (values as { teamsMeetingAttachments?: unknown[] })
              .teamsMeetingAttachments || [],
          );

          const isUpdatingTeams =
            candidate.assignment?.microsoftTeams?.meetingId;

          const teamsDuration =
            (values as { teamsMeetDuration?: number }).teamsMeetDuration ?? 30;
          const teamsNotes =
            (values as { teamsMeetingNotes?: string }).teamsMeetingNotes ?? '';

          teamsResult = isUpdatingTeams
            ? await updateTeamsMeeting({
                meetingId:
                  candidate.assignment?.microsoftTeams?.meetingId || '',
                eventId: candidate.assignment?.microsoftTeams?.eventId || '',
                candidateId: candidate._id,
                scheduledTime: values.time?.toISOString() ?? '',
                duration: teamsDuration,
                guests: teamsGuests,
              }).unwrap()
            : await scheduleTeamsMeeting({
                candidateId: candidate._id,
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                interviewerId: selectedInterviewer._id,
                interviewerName: selectedInterviewer.name,
                interviewerEmail: selectedInterviewer.email,
                scheduledTime: values.time?.toISOString() ?? '',
                duration: teamsDuration,
                guests: teamsGuests,
                jobTitle: candidate.jobId?.title || 'Position',
                organizationName: user?.organizationInfo?.name || 'Company',
                meetingNotes: teamsNotes,
                meetingAttachments: processedTeamsAttachments,
              }).unwrap();
        }

        const remarkParts = [values.remark];
        if (googleResult) {
          if (values.meetingNotes) remarkParts.push(values.meetingNotes);
          remarkParts.push(`Google Meet Link: ${googleResult.meetingLink}`);
        }
        if (zoomResult) {
          if (values.zoomMeetingNotes)
            remarkParts.push(values.zoomMeetingNotes);
          remarkParts.push(`Zoom Link: ${zoomResult.meetingLink}`);
        }
        if (teamsResult) {
          if (values.teamsMeetingNotes)
            remarkParts.push(values.teamsMeetingNotes);
          remarkParts.push(`Microsoft Teams Link: ${teamsResult.meetingLink}`);
        }
        const updatedValues: FormValues = {
          ...values,
          remark: remarkParts.filter(Boolean).join('\n\n').trim(),
          ...(googleResult && {
            googleMeetData: {
              eventId: googleResult.eventId,
              meetingLink: googleResult.meetingLink,
              htmlLink: googleResult.htmlLink,
              summary: googleResult.summary,
              description: googleResult.description,
              meetingNotes: values.meetingNotes,
              meetingAttachments: processedGoogleAttachments,
            },
          }),
          ...(zoomResult && {
            zoomMeetData: {
              meetingId: zoomResult.meetingId,
              meetingLink: zoomResult.meetingLink,
              startUrl: zoomResult.startUrl,
              eventId: zoomResult.eventId,
              htmlLink: zoomResult.htmlLink,
              summary: zoomResult.summary,
              description: zoomResult.description,
              meetingNotes: values.zoomMeetingNotes,
              meetingAttachments: processedZoomAttachments,
            },
          }),
          ...(teamsResult && {
            microsoftTeamsData: {
              meetingId: teamsResult.meetingId,
              meetingLink: teamsResult.meetingLink,
              eventId: teamsResult.eventId,
              htmlLink: teamsResult.htmlLink,
              summary: teamsResult.summary,
              description: teamsResult.description,
              meetingNotes: values.teamsMeetingNotes,
              meetingAttachments: processedTeamsAttachments,
            },
          }),
          attachments: [
            ...uploadedAttachments,
            ...processedGoogleAttachments,
            ...processedZoomAttachments,
            ...processedTeamsAttachments,
          ],
        };

        await handleSubmit(updatedValues, formikHelpers, interviewers);

        if (refetch) {
          await refetch();
        }

        const scheduledProviders = [
          scheduleGoogle && 'Google Meet',
          scheduleZoom && 'Zoom',
          scheduleTeams && 'Microsoft Teams',
        ].filter(Boolean) as string[];
        const singleProviderMessages: Record<string, string> = {
          'Google Meet': 'Google Meet scheduled and candidate assigned',
          Zoom: 'Zoom meeting scheduled and candidate assigned',
          'Microsoft Teams': 'Microsoft Teams scheduled and candidate assigned',
        };
        const description =
          scheduledProviders.length > 1
            ? `${scheduledProviders.join(' and ')} scheduled`
            : (singleProviderMessages[scheduledProviders[0] ?? ''] ??
              'Meeting scheduled and candidate assigned');

        toast({
          title: 'Success',
          description,
        });
      } catch (error) {
        logger.error('Meeting scheduling error:', error);
        toast({
          title: 'Error',
          description:
            (error as { data?: { error?: string } }).data?.error ||
            (error as { message?: string }).message ||
            'Failed to schedule/update meeting',
          variant: 'destructive',
        });
        formikHelpers.setSubmitting(false);
      }
    } else {
      const finalValues = {
        ...values,
        attachments: uploadedAttachments,
      };
      await handleSubmit(finalValues, formikHelpers, interviewers || []);
    }
  };

  return { handleFormSubmit };
}
