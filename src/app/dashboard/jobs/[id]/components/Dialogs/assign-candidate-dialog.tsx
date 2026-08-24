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
  useFetchInterviewersQuery,
} from '@/lib/features/user/userApi';
import { Loader2 } from 'lucide-react';
import {
  useGetGoogleCalendarConfigQuery,
  useGetZoomConfigQuery,
  useGetMicrosoftTeamsConfigQuery,
} from '@/lib/features/settings';
import dayjs from 'dayjs';
import { useAppSelector } from '@/lib/redux/hooks';
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
import { useAssignCandidateFormSubmit } from '../../hooks/useAssignCandidateFormSubmit';

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
  const { user } = useAppSelector((state) => state.auth);

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

  const { handleFormSubmit } = useAssignCandidateFormSubmit({
    candidate,
    handleSubmit,
    refetch,
  });

  useEffect(() => {
    if (isOpen) {
      refetchInterviewers();
    }
  }, [isOpen, refetchInterviewers]);

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

  const onSubmit = (values: FormValues, formikHelpers: FormikHelpers<FormValues>) =>
    handleFormSubmit(values, formikHelpers, interviewers);

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
            onSubmit={onSubmit}
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


