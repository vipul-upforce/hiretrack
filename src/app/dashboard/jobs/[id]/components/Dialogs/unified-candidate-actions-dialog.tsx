'use client';

import React from 'react';
import { Formik, Form } from 'formik';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { IGoogleCalendar } from '@/lib/models/settings';
import { ActionToggles } from '@/components/unified-candidate-dialog/action-toggle';
import { AssignSection } from '@/components/unified-candidate-dialog/assign-section';
import { SwitchJobSection } from '@/components/unified-candidate-dialog/switch-job-section';
import { FollowUpSection } from '@/components/unified-candidate-dialog/followup-section';
import { RemarkSection } from '@/components/unified-candidate-dialog/remark-section';
import { CancelMeetingDialog } from '@/components/unified-candidate-dialog/cancel-meeting-dialog';
import { useCandidateActions } from '@/components/unified-candidate-dialog/use-candidate-action';
import {
  validationSchema,
  UnifiedCandidateActionsDialogProps,
} from '@/components/unified-candidate-dialog/types';

export function UnifiedCandidateActionsDialog(
  props: UnifiedCandidateActionsDialogProps,
) {
  const { candidate, isOpen, onOpenChange } = props;

  const {
    state: {
      isSubmitting,
      showCancelMeetDialog,
      cancelNotes,
      actionCheckboxes,
      isCancelling,
    },
    data: { user, jobs, interviewers, googleCalendarData, initialValues },
    handlers: {
      handleSubmit,
      handleCancelMeeting,
      setCancelNotes,
      setShowCancelMeetDialog,
      toggleAction,
    },
  } = useCandidateActions(props);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          size="lg"
          className="flex max-h-[90vh] flex-col overflow-hidden"
        >
          <DialogHeader className="px-6 py-4">
            <DialogTitle>
              Update Candidate -{' '}
              {Array.isArray(candidate)
                ? `${candidate.length} Candidates`
                : candidate.name}
            </DialogTitle>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, setFieldValue, submitForm }) => {
              const handleKeyDown = (
                event: React.KeyboardEvent<HTMLFormElement>,
              ) => {
                if (event.altKey && event.key === 'Enter') {
                  event.preventDefault();
                  submitForm();
                }
              };

              return (
                <Form
                  className="flex flex-1 flex-col overflow-hidden"
                  onKeyDown={handleKeyDown}
                >
                  <ActionToggles
                    candidate={candidate}
                    actionCheckboxes={actionCheckboxes}
                    onChange={toggleAction}
                    userRole={user?.role}
                    isSubmitting={isSubmitting}
                  />

                  <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
                    {actionCheckboxes.assignTo &&
                      user?.role !== 'interviewer' && (
                        <AssignSection
                          candidate={candidate}
                          values={values}
                          setFieldValue={setFieldValue}
                          interviewers={interviewers}
                          googleCalendarData={
                            googleCalendarData?.googleCalendar as IGoogleCalendar
                          }
                          setShowCancelMeetDialog={setShowCancelMeetDialog}
                        />
                      )}

                    {actionCheckboxes.switchJob &&
                      user?.role !== 'interviewer' && (
                        <SwitchJobSection
                          values={values}
                          setFieldValue={setFieldValue}
                          jobs={jobs}
                        />
                      )}

                    {actionCheckboxes.markAsDone && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Candidate will be unassigned after marking as done.
                        </p>
                      </div>
                    )}

                    {actionCheckboxes.addFollowUp &&
                      user?.role !== 'interviewer' && (
                        <FollowUpSection
                          values={values}
                          setFieldValue={setFieldValue}
                          userRole={user?.role}
                          candidate={candidate}
                        />
                      )}

                    {actionCheckboxes.addRemark && (
                      <RemarkSection
                        values={values}
                        setFieldValue={setFieldValue}
                        organizationId={user?.organizationId as string}
                        userRole={user?.role}
                      />
                    )}
                  </div>

                  <DialogFooter className="border-t px-6 py-4">
                    <div className="flex w-full justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
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
                        {isSubmitting ? 'Updating...' : 'Update Candidate'}
                      </Button>
                    </div>
                  </DialogFooter>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>

      <CancelMeetingDialog
        open={showCancelMeetDialog}
        onOpenChange={setShowCancelMeetDialog}
        cancelNotes={cancelNotes}
        setCancelNotes={setCancelNotes}
        onConfirm={handleCancelMeeting}
        isCancelling={isCancelling}
      />
    </>
  );
}
