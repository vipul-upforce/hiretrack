'use client';

import React, { useEffect, useState } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Interviewer,
  useFetchInterviewersQuery,
} from '@/lib/features/user/userApi';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Loader2 } from 'lucide-react';
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
  useCancelMeetingMutation,
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
  useCancelZoomMeetingMutation,
  useScheduleZoomMeetingMutation,
  useUpdateZoomMeetingMutation,
  useCancelTeamsMeetingMutation,
  useScheduleTeamsMeetingMutation,
  useUpdateTeamsMeetingMutation,
  type MeetingAttachment,
} from '@/lib/features/calendar/calendarApi';
import {
  IGoogleCalendar,
  IZoomConfig,
  IMicrosoftTeamsConfig,
} from '@/lib/models/settings';
import {
  validationSchema,
  FormValues,
  AssignCandidateDialogProps,
} from '../../schemas/AssignCandidateSchema';
import { InterviewerSelector } from './assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from './assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from './assign-candidate-components/google-meet/GoogleMeetIntegration';
import { ZoomMeetIntegration } from './assign-candidate-components/zoom-meet/ZoomMeetIntegration';
import { TeamsMeetIntegration } from './assign-candidate-components/teams-meet/TeamsMeetIntegration';
import { AssignmentDetailsSection } from './assign-candidate-components/AssignmentDetailsSection';
import ConfirmAndRemarkDialog from './mark-as-done-dialog';
import { useAssignCandidate } from '../../hooks/useAssignCandidate';

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
  const [cancelMeetingProvider, setCancelMeetingProvider] = useState<
    'google' | 'zoom' | 'teams' | null
  >(null);
  const [cancelNotes, setCancelNotes] = useState('');

  const [scheduleMeeting] = useScheduleMeetingMutation();
  const [updateMeeting] = useUpdateMeetingMutation();
  const [cancelMeeting, { isLoading: isCancelling }] =
    useCancelMeetingMutation();
  const [scheduleZoomMeeting] = useScheduleZoomMeetingMutation();
  const [updateZoomMeeting] = useUpdateZoomMeetingMutation();
  const [cancelZoomMeeting, { isLoading: isCancellingZoom }] =
    useCancelZoomMeetingMutation();
  const [cancelTeamsMeeting, { isLoading: isCancellingTeams }] =
    useCancelTeamsMeetingMutation();
  const [scheduleTeamsMeeting] = useScheduleTeamsMeetingMutation();
  const [updateTeamsMeeting] = useUpdateTeamsMeetingMutation();

  const showCancelMeetDialog = cancelMeetingProvider !== null;
  const cancelLabelByProvider: Record<
    'google' | 'zoom' | 'teams',
    string
  > = {
    google: 'Google Meet',
    zoom: 'Zoom',
    teams: 'Microsoft Teams',
  };
  const activeCancelLabel =
    cancelMeetingProvider !== null
      ? cancelLabelByProvider[cancelMeetingProvider]
      : '';
  const isCancellingByProvider = {
    google: isCancelling,
    zoom: isCancellingZoom,
    teams: isCancellingTeams,
  };
  const isCancellingActive =
    cancelMeetingProvider !== null
      ? isCancellingByProvider[cancelMeetingProvider]
      : false;

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

        const processAttachments = async (files: unknown[]) =>
          Promise.all(
            (files || []).map(async (file) => {
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
              return file;
            }),
          );

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
        let processedGoogleAttachments: typeof values.meetingAttachments = [];
        let processedZoomAttachments: typeof values.zoomMeetingAttachments = [];
        let processedTeamsAttachments: typeof values.teamsMeetingAttachments = [];

        if (scheduleGoogle) {
          processedGoogleAttachments = await processAttachments(
            values.meetingAttachments || [],
          );

          const isUpdatingGoogle = candidate.assignment?.googleMeet?.eventId;

          googleResult = isUpdatingGoogle
            ? await updateMeeting({
              eventId: candidate.assignment?.googleMeet?.eventId || '',
              candidateId: candidate._id,
              scheduledTime: values.time?.toISOString(),
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
              scheduledTime: values.time?.toISOString(),
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
          );

          const isUpdatingZoom = candidate.assignment?.zoomMeet?.meetingId;

          zoomResult = isUpdatingZoom
            ? await updateZoomMeeting({
              meetingId: candidate.assignment?.zoomMeet?.meetingId || '',
              eventId: candidate.assignment?.zoomMeet?.eventId || '',
              candidateId: candidate._id,
              scheduledTime: values.time?.toISOString(),
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
              scheduledTime: values.time?.toISOString(),
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
              meetingAttachments: processedTeamsAttachments as MeetingAttachment[],
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
        const updatedValues = {
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
            ...values.attachments,
            ...(processedGoogleAttachments || []),
            ...(processedZoomAttachments || []),
            ...(processedTeamsAttachments || []),
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
      await handleSubmit(values, formikHelpers, interviewers || []);
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

        await cancelZoomMeeting({
          meetingId: candidate.assignment.zoomMeet.meetingId,
          eventId: candidate.assignment.zoomMeet.eventId || '',
          candidateId: candidate._id,
          cancelNotes,
        }).unwrap();

        toast({
          title: 'Success',
          description: 'Zoom meeting cancelled successfully',
        });
      }

      if (cancelMeetingProvider === 'teams') {
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
      onOpenChange(false);
      setCancelMeetingProvider(null);
      setCancelNotes('');
    } catch (error) {
      logger.error('Error cancelling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel meeting',
        variant: 'destructive',
      });
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
                          onRequestCancel={() =>
                            setCancelMeetingProvider('google')
                          }
                          isBulkMode={false}
                        />
                      )}

                      {zoomConfigData && (
                        <ZoomMeetIntegration
                          candidate={candidate}
                          interviewers={interviewers}
                          zoomConfig={zoomConfigData.zoom as IZoomConfig}
                          onRequestCancel={() =>
                            setCancelMeetingProvider('zoom')
                          }
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
                          onRequestCancel={() =>
                            setCancelMeetingProvider('teams')
                          }
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

      {showCancelMeetDialog && (
        <Dialog
          open={showCancelMeetDialog}
          onOpenChange={(open) => {
            if (!open) {
              setCancelMeetingProvider(null);
              setCancelNotes('');
            }
          }}
        >
          <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
            <DialogHeader className="flex flex-col gap-2 border-b p-6 pb-4">
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Cancel {activeCancelLabel}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/90">
                Are you sure you want to cancel this {activeCancelLabel}? This
                action cannot be undone and attendees will be notified.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <Label
                  htmlFor="cancelNotes"
                  className="text-sm font-semibold text-foreground"
                >
                  Cancellation Notes{' '}
                  <span className="font-normal text-muted-foreground">
                    (Optional)
                  </span>
                </Label>
                <Textarea
                  id="cancelNotes"
                  placeholder="Reason for cancellation, rescheduling information, or other notes..."
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="min-h-[60px] resize-y focus-visible:ring-offset-1"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-3 bg-background p-6 pt-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => {
                  setCancelMeetingProvider(null);
                  setCancelNotes('');
                }}
              >
                Keep Meeting
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isCancellingActive}
                onClick={handleCancelMeeting}
              >
                {isCancellingActive ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancel Meeting
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}


