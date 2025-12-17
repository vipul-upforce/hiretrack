'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useFetchInterviewersQuery } from '@/lib/features/user/userApi';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Loader2 } from 'lucide-react';
import { useGetGoogleCalendarConfigQuery } from '@/lib/features/settings/settingsApi';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import dayjs from 'dayjs';
import { Interviewer } from '@/app/dashboard/calendar/types';
import { FileAttachment } from '@/lib/fileUtils';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  validationSchema,
  FormValues,
  AssignCandidateDialogProps,
  User,
} from '../../schemas/AssignCandidateSchema';
import { useAssignCandidate } from '../../hooks/useAssignCandidate';
import { InterviewerSelector } from './assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from './assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from './assign-candidate-components/GoogleMeetIntegration';
import { AssignmentDetailsSection } from './assign-candidate-components/AssignmentDetailsSection';
import ConfirmationDialog from './ConfirmationDialog';

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
  const [isCancelling, setIsCancelling] = useState(false);

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
          (values.meetingAttachments || []).map(
            async (file: FileAttachment) => {
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
            },
          ),
        );

        const isUpdating = candidate.assignment?.googleMeet?.eventId;
        const apiUrl = isUpdating
          ? '/api/google-calendar/update-meet'
          : '/api/google-calendar/schedule-meet';
        const method = isUpdating ? 'PUT' : 'POST';

        const requestBody = isUpdating
          ? {
              eventId: candidate.assignment?.googleMeet?.eventId,
              candidateId: candidate._id,
              scheduledTime: values.time?.toISOString(),
              duration: values.meetDuration || 30,
              guests: allGuests,
            }
          : {
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
            };

        const response = await fetch(apiUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to schedule Google Meet');
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

        await handleSubmit(updatedValues, formikHelpers, user, interviewers);

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
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to schedule Google Meet',
          variant: 'destructive',
        });
        formikHelpers.setSubmitting(false);
      }
    } else {
      await handleSubmit(values, formikHelpers, user, interviewers);
    }
  };

  const handleFormSubmitRef = useRef(handleFormSubmit);
  useEffect(() => {
    handleFormSubmitRef.current = handleFormSubmit;
  }, [handleFormSubmit]);

  const getOnAltEnterSubmit = useCallback(
    (
      values: FormValues,
      formikHelpers: FormikHelpers<FormValues>,
      isSubmitting: boolean,
    ) =>
      (fieldValue: string) =>
      (e: React.KeyboardEvent) => {
        if (e.altKey && e.key === 'Enter') {
          e.preventDefault();
          if (fieldValue?.trim() && !isSubmitting) {
            handleFormSubmit(values, formikHelpers);
          }
        }
      },
    [],
  );

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

                      <GoogleMeetIntegration
                        candidate={candidate}
                        user={user}
                        interviewers={interviewers}
                        googleCalendarData={googleCalendarData}
                        setShowCancelMeetDialog={setShowCancelMeetDialog}
                        getOnAltEnterSubmit={getOnAltEnterSubmit}
                        // isSubmitting={isSubmitting}
                        // formikProps={formikProps}
                      />

                      <AssignmentDetailsSection
                        user={user as User}
                        candidate={candidate}
                        getOnAltEnterSubmit={getOnAltEnterSubmit}
                        isSubmitting={isSubmitting}
                        formikProps={formikProps}
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
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
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
            onConfirm={() => confirmUnassign(user)}
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
          <DialogContent className="p-6 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Cancel Google Meet
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this Google Meet? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelNotes" className="text-sm font-medium">
                  Cancellation Notes (Optional)
                </Label>
                <Textarea
                  id="cancelNotes"
                  placeholder="Reason for cancellation, rescheduling information, or other notes..."
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
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
                onClick={async () => {
                  setIsCancelling(true);
                  try {
                    const response = await fetch(
                      `/api/google-calendar/update-meet?eventId=${candidate.assignment?.googleMeet?.eventId}&candidateId=${candidate._id}&cancelNotes=${encodeURIComponent(cancelNotes)}`,
                      { method: 'DELETE' },
                    );
                    if (response.ok) {
                      toast({
                        title: 'Success',
                        description: 'Google Meet cancelled successfully',
                      });
                      refetch();
                      onOpenChange(false);
                      setShowCancelMeetDialog(false);
                      setCancelNotes('');
                    } else {
                      throw new Error('Failed to cancel meeting');
                    }
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to cancel Google Meet',
                      variant: 'destructive',
                    });
                  } finally {
                    setIsCancelling(false);
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isCancelling ? 'Cancelling...' : 'Cancel Meeting'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
