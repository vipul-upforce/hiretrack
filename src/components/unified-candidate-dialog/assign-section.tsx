import React from 'react';
import { Candidate } from '@/types/candidate';
import { Interviewer } from '@/lib/features/user/userApi';
import { IGoogleCalendar } from '@/lib/models/settings';
import { InterviewerSelector } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/google-meet/GoogleMeetIntegration';
import { UnifiedFormValues } from './types';
import { AttachmentsSection } from './attachments-section';

interface AssignSectionProps {
  candidate: Candidate;
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  interviewers: Interviewer[] | undefined;
  googleCalendarData?: IGoogleCalendar;
  setShowCancelMeetDialog: (show: boolean) => void;
}

export function AssignSection({
  candidate,
  values,
  setFieldValue,
  interviewers,
  googleCalendarData,
  setShowCancelMeetDialog,
}: AssignSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h3 className="text-base font-semibold text-foreground">Assign To</h3>
      </div>
      <div className="space-y-4">
        <InterviewerSelector interviewers={interviewers} />
        <DateTimePickerSection />
        {googleCalendarData ? (
          <GoogleMeetIntegration
            candidate={candidate}
            interviewers={interviewers}
            googleCalendarData={googleCalendarData}
            setShowCancelMeetDialog={setShowCancelMeetDialog}
          />
        ) : null}
        <AttachmentsSection
          candidate={candidate}
          values={values}
          setFieldValue={setFieldValue}
        />
      </div>
    </div>
  );
}
