'use client';

import React, { useRef, useMemo } from 'react';
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
import {
  IGoogleCalendar,
  IZoomConfig,
  IMicrosoftTeamsConfig,
} from '@/lib/models/settings';
import { ActionToggles } from '@/components/unified-candidate-dialog/action-toggle';
import { AssignSection } from '@/components/unified-candidate-dialog/assign-section';
import { SwitchJobSection } from '@/components/unified-candidate-dialog/switch-job-section';
import { FollowUpSection } from '@/components/unified-candidate-dialog/followup-section';
import { RemarkSection } from '@/components/unified-candidate-dialog/remark-section';
import { CancelMeetingDialog } from '@/components/unified-candidate-dialog/cancel-meeting-dialog';
import { StatusUpdateSection } from '@/components/unified-candidate-dialog/status-update-section';
import { useCandidateActions } from '@/components/unified-candidate-dialog/use-candidate-action';
import {
  getValidationSchema,
  UnifiedCandidateActionsDialogProps,
} from '@/components/unified-candidate-dialog/types';
import { ScrollToFormError } from '@/components/ui/scroll-to-error';

export function UnifiedCandidateActionsDialog(
  props: UnifiedCandidateActionsDialogProps,
) {
  const { candidate, candidates, isOpen, onOpenChange } = props;
  const isBulkMode = candidates && candidates.length > 1;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    state: {
      isSubmitting,
      showCancelMeetDialog,
      cancelNotes,
      isCancelling,
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
  } = useCandidateActions(props);

  const currentJobId =
    typeof candidate.jobId === 'object'
      ? candidate.jobId?._id
      : candidate.jobId;

  const validationSchema = useMemo(
    () => getValidationSchema(currentJobId),
    [currentJobId],
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          size="xl"
          className="flex max-h-[90vh] flex-col overflow-hidden p-0"
        >
          <DialogHeader className="border-0 px-6 py-3 pt-5">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              {isBulkMode ? (
                <span>
                  Update{' '}
                  <span className="font-bold text-primary">
                    {candidates?.length}
                  </span>{' '}
                  Candidates
                </span>
              ) : (
                <span>
                  Update Candidate -{' '}
                  <span className="font-bold text-primary">
                    {candidate.name}
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            validateOnChange
            validateOnBlur
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, setFieldValue, submitForm, setFieldTouched }) => {
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
                  <ScrollToFormError containerRef={scrollContainerRef} />

                  <div className="border-b px-6 py-3">
                    <ActionToggles
                      candidate={candidate}
                      actionCheckboxes={values.enabledActions}
                      onChange={(action, checked) =>
                        toggleAction(
                          action,
                          checked,
                          setFieldValue,
                          values,
                          setFieldTouched,
                        )
                      }
                      userRole={user?.role}
                      isSubmitting={isSubmitting}
                    />
                  </div>

                  <div
                    ref={scrollContainerRef}
                    className="flex-1 space-y-4 overflow-y-auto bg-muted/10 px-6 py-4"
                  >
                    {values.enabledActions.assignTo &&
                      user?.role !== 'interviewer' && (
                        <AssignSection
                          candidate={candidate}
                          isBulkMode={isBulkMode}
                          values={values}
                          setFieldValue={setFieldValue}
                          interviewers={interviewers}
                          googleCalendarData={
                            googleCalendarData?.googleCalendar as IGoogleCalendar
                          }
                          zoomConfig={zoomConfigData?.zoom as IZoomConfig}
                          teamsConfig={
                            teamsConfigData?.microsoftTeams as IMicrosoftTeamsConfig
                          }
                          onRequestCancel={setCancelMeetingProvider}
                        />
                      )}

                    {values.enabledActions.switchJob &&
                      user?.role !== 'interviewer' && (
                        <SwitchJobSection
                          candidate={candidate}
                          values={values}
                          setFieldValue={setFieldValue}
                          jobs={jobs}
                        />
                      )}

                    {values.enabledActions.markAsDone && (
                      <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 shadow-sm dark:border-amber-800/60 dark:from-amber-950/40 dark:to-amber-900/20">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                              !
                            </span>
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-100">
                            Candidate will be unassigned after marking as done.
                          </p>
                        </div>
                      </div>
                    )}

                    {values.enabledActions.addFollowUp &&
                      user?.role !== 'interviewer' && (
                        <FollowUpSection
                          values={values}
                          setFieldValue={setFieldValue}
                          userRole={user?.role}
                          candidate={candidate}
                        />
                      )}

                    {values.enabledActions.addRemark && (
                      <RemarkSection
                        values={values}
                        setFieldValue={setFieldValue}
                        organizationId={user?.organizationId as string}
                        userRole={user?.role}
                      />
                    )}

                    {values.enabledActions.updateStatus &&
                      user?.role !== 'interviewer' &&
                      !values.enabledActions.switchJob && (
                        <StatusUpdateSection
                          candidate={candidate}
                          values={values}
                          setFieldValue={setFieldValue}
                          lanes={jobLanesData?.lanes || []}
                          isLoadingLanes={isLoadingLanes}
                        />
                      )}
                  </div>

                  <DialogFooter className="border-t bg-background px-6 py-3">
                    <div className="flex w-full items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="min-w-[100px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant="info"
                        className="min-w-[140px] font-medium shadow-sm transition-all hover:shadow-md"
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
        onOpenChange={(open) => {
          if (!open) {
            setCancelMeetingProvider(null);
            setCancelNotes('');
          }
        }}
        meetingType={
          cancelMeetingProvider === 'zoom'
            ? 'Zoom'
            : cancelMeetingProvider === 'teams'
              ? 'Microsoft Teams'
              : 'Google Meet'
        }
        cancelNotes={cancelNotes}
        setCancelNotes={setCancelNotes}
        onConfirm={handleCancelMeeting}
        isCancelling={isCancelling}
      />
    </>
  );
}
