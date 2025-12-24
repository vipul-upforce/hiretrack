/* eslint-disable max-lines */

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
import { useGetGoogleCalendarConfigQuery } from '@/lib/features/settings';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';
import { useAppSelector } from '@/lib/redux/hooks';
import logger from '@/lib/logger';
import {
  useCancelMeetingMutation,
  useScheduleMeetingMutation,
  useUpdateMeetingMutation,
} from '@/lib/features/calendar/calendarApi';
import { IGoogleCalendar } from '@/lib/models/settings';
import {
  validationSchema,
  FormValues,
  AssignCandidateDialogProps,
  User,
} from '../../schemas/AssignCandidateSchema';
import { InterviewerSelector } from './assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from './assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from './assign-candidate-components/google-meet/GoogleMeetIntegration';
import { AssignmentDetailsSection } from './assign-candidate-components/AssignmentDetailsSection';
import ConfirmationDialog from './ConfirmationDialog';
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
  const [showCancelMeetDialog, setShowCancelMeetDialog] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');

  const [scheduleMeeting] = useScheduleMeetingMutation();
  const [updateMeeting] = useUpdateMeetingMutation();
  const [cancelMeeting, { isLoading: isCancelling }] =
    useCancelMeetingMutation();

  const { user } = useAppSelector((state) => state.auth || {});
  const { data: interviewers, refetch: refetchInterviewers } =
    useFetchInterviewersQuery();
  const { data: googleCalendarData } =
    useGetGoogleCalendarConfigQuery(undefined);
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
        : candidate.assignment?.interviewerId?._id || '',
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
  };

  const handleFormSubmit = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>,
  ) => {
    if (values.scheduleGoogleMeet && values.time) {
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

        const defaultGuests = getDefaultGuests(selectedInterviewer);
        const allGuests = [
          ...defaultGuests,
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

        const isUpdating = candidate.assignment?.googleMeet?.eventId;
        let result;

        if (isUpdating) {
          // UPDATE EXISTING MEETING
          result = await updateMeeting({
            eventId: candidate.assignment?.googleMeet?.eventId || '',
            candidateId: candidate._id,
            scheduledTime: values.time?.toISOString(),
            duration: values.meetDuration || 30,
            guests: allGuests,
          }).unwrap();
        } else {
          // SCHEDULE NEW MEETING
          result = await scheduleMeeting({
            candidateId: candidate._id,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            interviewerId: selectedInterviewer._id,
            interviewerName: selectedInterviewer.name,
            scheduledTime: values.time?.toISOString(),
            duration: values.meetDuration || 30,
            guests: allGuests,
            jobTitle: candidate.jobId?.title || 'Position',
            organizationName: user?.organizationInfo?.name || 'Company',
            meetingNotes: values.meetingNotes || '',
            meetingAttachments: processedMeetingAttachments,
          }).unwrap();
        }

        const updatedValues = {
          ...values,
          remark:
            `${values.remark}\n\n${values.meetingNotes}\n\nGoogle Meet Link: ${result.meetingLink}`.trim(),
          googleMeetData: {
            eventId: result.eventId,
            meetingLink: result.meetingLink,
            htmlLink: result.htmlLink,
            summary: result.summary,
            description: result.description,
            meetingNotes: values.meetingNotes,
            meetingAttachments: processedMeetingAttachments,
          },
          attachments: [...values.attachments, ...processedMeetingAttachments],
        };

        await handleSubmit(updatedValues, formikHelpers, interviewers);

        if (refetch) {
          await refetch();
        }

        toast({
          title: 'Success',
          description: isUpdating
            ? 'Google Meet updated and candidate assigned'
            : 'Google Meet scheduled and candidate assigned',
        });
      } catch (error) {
        logger.error('❌ Google Meet Error:', error);
        toast({
          title: 'Error',
          description:
            (error as { data?: { error?: string } }).data?.error ||
            (error as { message?: string }).message ||
            'Failed to schedule/update Google Meet',
          variant: 'destructive',
        });
        formikHelpers.setSubmitting(false);
      }
    } else {
      await handleSubmit(values, formikHelpers, interviewers || []);
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
      onOpenChange(false);
      setShowCancelMeetDialog(false);
      setCancelNotes('');
    } catch (error) {
      logger.error('Error cancelling meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel Google Meet',
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
                    className={`flex-1 space-y-6 px-6 py-4 ${
                      !candidate.assignment?.googleMeet?.eventId &&
                      !values.scheduleGoogleMeet
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
                          setShowCancelMeetDialog={setShowCancelMeetDialog}
                        />
                      )}

                      <AssignmentDetailsSection
                        user={user as User}
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

          <ConfirmationDialog
            isOpen={confirmUnassignOpen}
            setIsOpen={setConfirmUnassignOpen}
            title="Confirm Mark As Done"
            message="Are you sure you want to Mark As Done this interviewer?"
            onConfirm={confirmUnassign}
            onCancel={() => setConfirmUnassignOpen(false)}
            className="sm:max-w-[300px]"
          />
        </DialogContent>
      </Dialog>

      {showCancelMeetDialog && (
        <Dialog
          open={showCancelMeetDialog}
          onOpenChange={setShowCancelMeetDialog}
        >
          <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
            <DialogHeader className="flex flex-col gap-2 border-b p-6 pb-4">
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Cancel Google Meet
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/90">
                Are you sure you want to cancel this Google Meet? This action
                cannot be undone and attendees will be notified.
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
                  setShowCancelMeetDialog(false);
                  setCancelNotes('');
                }}
              >
                Keep Meeting
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isCancelling}
                onClick={handleCancelMeeting}
              >
                {isCancelling ? (
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
