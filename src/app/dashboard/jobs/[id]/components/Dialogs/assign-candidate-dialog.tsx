'use client';

import React, { useEffect } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Interviewer,
  useFetchInterviewersQuery,
} from '@/lib/features/user/userApi';
import { Loader2 } from 'lucide-react';
import {
  useGetGoogleCalendarConfigQuery,
  useGetZoomConfigQuery,
  useGetMicrosoftTeamsConfigQuery,
} from '@/lib/features/settings';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';
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
import {
  IGoogleCalendar,
  IZoomConfig,
  IMicrosoftTeamsConfig,
} from '@/lib/models/settings';
import { CancelMeetingDialog } from '@/components/unified-candidate-dialog/cancel-meeting-dialog';
import {
  validationSchema,
  FormValues,
  AssignCandidateDialogProps,
  Attachment,
} from '../../schemas/AssignCandidateSchema';
import { InterviewerSelector } from './assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from './assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from './assign-candidate-components/google-meet/GoogleMeetIntegration';
import { ZoomMeetIntegration } from './assign-candidate-components/zoom-meet/ZoomMeetIntegration';
import { TeamsMeetIntegration } from './assign-candidate-components/teams-meet/TeamsMeetIntegration';
import { AssignmentDetailsSection } from './assign-candidate-components/AssignmentDetailsSection';
import ConfirmAndRemarkDialog from './mark-as-done-dialog';
import { useAssignCandidate } from '../../hooks/useAssignCandidate';
import { useCancelMeeting } from '../../hooks/useCancelMeeting';
import { useUploadFilesMutation } from '@/lib/features/candidate/candidateApi';
import { uploadAttachments } from '../../hooks/fileUploadUtils';

function LoadingSpinner({ w = 4 }: { w?: number }) {
  return <Loader2 className={`mr-2 h-${w} w-${w} animate-spin`} />;
}

export function AssignCandidateDialog({
  candidate,
  isOpen,
  refetch,
  onOpenChange,
  onUpdate,
  setLocalCandidate,
  refetchAssignment,
  onSuccess,
}: AssignCandidateDialogProps) {
  const { toast } = useToast();

  const [scheduleMeeting] = useScheduleMeetingMutation();
  const [updateMeeting] = useUpdateMeetingMutation();
  const [scheduleZoomMeeting] = useScheduleZoomMeetingMutation();
  const [updateZoomMeeting] = useUpdateZoomMeetingMutation();
  const [scheduleTeamsMeeting] = useScheduleTeamsMeetingMutation();
  const [updateTeamsMeeting] = useUpdateTeamsMeetingMutation();
  const [uploadFiles] = useUploadFilesMutation();

  const {
    cancelNotes,
    setCancelNotes,
    activeCancelLabel,
    isCancellingActive,
    showCancelMeetDialog,
    handleCancelMeeting,
    handleOpenCancelDialog,
    handleCloseCancelDialog,
  } = useCancelMeeting({
    candidate,
    refetch,
    onOpenChange,
  });

  const { user } = useAppSelector((state) => state.auth);
  const shouldFetchInterviewers =
    !!user && user.role !== 'candidate' && user.role !== '';
  const { data: interviewers, refetch: refetchInterviewers } =
    useFetchInterviewersQuery(undefined, { skip: !shouldFetchInterviewers });
  const { data: googleCalendarData } =
    useGetGoogleCalendarConfigQuery(undefined);
  const { data: zoomConfigData } = useGetZoomConfigQuery(undefined);
  const { data: teamsConfigData } = useGetMicrosoftTeamsConfigQuery(undefined);
  const {
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    handleSubmit,
    handleUnassign,
    confirmUnassign,
    isUnassigning,
  } = useAssignCandidate({
    candidate,
    refetch,
    onOpenChange,
    onUpdate,
    setLocalCandidate,
    refetchAssignment,
    onSuccess,
  });

  useEffect(() => {
    if (isOpen) {
      refetchInterviewers();
    }
  }, [isOpen, refetchInterviewers]);

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

  const initialValues: FormValues = {
    interviewerId:
      typeof candidate.assignment?.interviewerId === 'string'
        ? candidate.assignment.interviewerId
        : candidate.assignment?.interviewerId?._id || null,
    time: candidate.assignment?.time
      ? dayjs(candidate?.assignment?.time)
      : null,
    remark: '',
    rating: null,
    attachments: [],
    scheduleGoogleMeet: !!candidate?.assignment?.googleMeet?.eventId,
    meetDuration: 60,
    meetingNotes: candidate?.assignment?.googleMeet?.meetingNotes || '',
    meetingAttachments:
      candidate?.assignment?.googleMeet?.meetingAttachments || [],
    additionalGuests: [],
    scheduleZoomMeet: !!candidate?.assignment?.zoomMeet?.meetingId,
    zoomMeetDuration: 40,
    zoomMeetingNotes: candidate?.assignment?.zoomMeet?.meetingNotes || '',
    zoomMeetingAttachments:
      candidate?.assignment?.zoomMeet?.meetingAttachments || [],
    zoomAdditionalGuests: [],
    scheduleTeamsMeet: !!candidate?.assignment?.microsoftTeams?.meetingId,
    teamsMeetDuration: 30,
    teamsMeetingNotes: candidate?.assignment?.microsoftTeams?.meetingNotes || '',
    teamsMeetingAttachments:
      candidate?.assignment?.microsoftTeams?.meetingAttachments || [],
    teamsAdditionalGuests: [],
  };

  const handleFormSubmit = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>,
  ) => {
    const scheduleGoogle = values.scheduleGoogleMeet && values.time;
    const scheduleZoom = values.scheduleZoomMeet && values.time;
    const scheduleTeams = values.scheduleTeamsMeet && values.time;

    // Upload regular attachments first
    let uploadedAttachments = values.attachments || [];
    if (uploadedAttachments.length > 0) {
      try {
        uploadedAttachments = await uploadAttachments({
          attachments: uploadedAttachments,
          uploadFiles,
          organizationId: user?.organizationId,
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
          // Upload meeting attachments
          return uploadAttachments({
            attachments: attachmentsToProcess,
            uploadFiles,
            organizationId: user?.organizationId,
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
          ...((values as { teamsAdditionalGuests?: string[] }).teamsAdditionalGuests ||
            []),
        ];

        let googleResult;
        let zoomResult;
        let teamsResult;
        let processedGoogleAttachments: Attachment[] = [];
        let processedZoomAttachments: Attachment[] = [];
        let processedTeamsAttachments: Attachment[] = [];

        if (scheduleGoogle) {
          processedGoogleAttachments = await processAttachments(
            values.meetingAttachments || [],
          ) as Attachment[];

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
          processedZoomAttachments = await processAttachments(
            values.zoomMeetingAttachments || [],
          ) as Attachment[];

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

          const teamsDuration = (values as { teamsMeetDuration?: number })
            .teamsMeetDuration ?? 30;
          const teamsNotes = (values as { teamsMeetingNotes?: string })
            .teamsMeetingNotes ?? '';

          teamsResult = isUpdatingTeams
            ? await updateTeamsMeeting({
              meetingId:
                candidate.assignment?.microsoftTeams?.meetingId || '',
              eventId:
                candidate.assignment?.microsoftTeams?.eventId || '',
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
          if (values.teamsMeetingNotes) remarkParts.push(values.teamsMeetingNotes);
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
            : singleProviderMessages[scheduledProviders[0] ?? ''] ??
            'Meeting scheduled and candidate assigned';

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
      // Upload attachments before submitting if no meetings scheduled
      const finalValues = {
        ...values,
        attachments: uploadedAttachments,
      };
      await handleSubmit(finalValues, formikHelpers, interviewers || []);
    }
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          size="lg"
          className="flex flex-col justify-start overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>Assign Candidate - {candidate.name}</DialogTitle>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleFormSubmit}
            enableReinitialize
          >
            {(formikProps) => {
              const { values, isSubmitting } = formikProps;
              return (
                <Form className="flex h-full flex-1 flex-col overflow-hidden">
                  <div
                    className={`flex-1 space-y-6 px-6 py-4 ${!candidate.assignment?.googleMeet?.eventId &&
                      !values.scheduleGoogleMeet &&
                      !candidate.assignment?.zoomMeet?.meetingId &&
                      !values.scheduleZoomMeet &&
                      !candidate.assignment?.microsoftTeams?.meetingId &&
                      !values.scheduleTeamsMeet
                      ? ''
                      : 'overflow-y-auto'
                      }`}
                  >
                    <div className="grid gap-4 py-4">
                      <InterviewerSelector interviewers={interviewers} />

                      <DateTimePickerSection />

                      {googleCalendarData && (
                        <GoogleMeetIntegration
                          candidate={candidate}
                          interviewers={interviewers}
                          googleCalendarData={
                            googleCalendarData.googleCalendar as IGoogleCalendar
                          }
                          onRequestCancel={() => handleOpenCancelDialog('google')}
                          isBulkMode={false}
                        />
                      )}

                      {zoomConfigData && (
                        <ZoomMeetIntegration
                          candidate={candidate}
                          interviewers={interviewers}
                          zoomConfig={zoomConfigData.zoom as IZoomConfig}
                          onRequestCancel={() => handleOpenCancelDialog('zoom')}
                          isBulkMode={false}
                        />
                      )}

                      {teamsConfigData && (
                        <TeamsMeetIntegration
                          candidate={candidate}
                          interviewers={interviewers}
                          teamsConfig={
                            teamsConfigData.microsoftTeams as IMicrosoftTeamsConfig
                          }
                          onRequestCancel={() => handleOpenCancelDialog('teams')}
                          isBulkMode={false}
                        />
                      )}

                      <AssignmentDetailsSection
                        candidate={candidate}
                      />
                    </div>
                  </div>

                  <div className="sticky bottom-0 z-10 flex w-full justify-between space-x-2 border-t bg-background px-6 py-4">
                    <div>
                      {candidate.assignment && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUnassigning}
                          onClick={handleUnassign}
                        >
                          {isUnassigning && <LoadingSpinner w={5} />}
                          {isUnassigning ? 'Marking...' : 'Mark As Done'}
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => onOpenChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant="info"
                      >
                        {isSubmitting && <LoadingSpinner w={4} />}
                        {isSubmitting ? 'Assigning...' : 'Assign'}
                      </Button>
                    </div>
                  </div>
                </Form>
              );
            }}
          </Formik>

          <ConfirmAndRemarkDialog
            isOpen={confirmUnassignOpen}
            setIsOpen={setConfirmUnassignOpen}
            title="Mark as Done"
            message="Are you sure you want to Mark As Done this interviewer?"
            onConfirm={confirmUnassign}
            onCancel={() => setConfirmUnassignOpen(false)}
            isLoading={isUnassigning}
            loadingText="Marking as done..."
          />
        </DialogContent>
      </Dialog>

      <CancelMeetingDialog
        open={showCancelMeetDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCancelDialog();
          }
        }}
        meetingType={activeCancelLabel}
        cancelNotes={cancelNotes}
        setCancelNotes={setCancelNotes}
        onConfirm={handleCancelMeeting}
        isCancelling={isCancellingActive}
      />
    </>
  );
}


