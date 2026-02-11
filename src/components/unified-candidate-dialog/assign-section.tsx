import React from 'react';
import { Candidate } from '@/types/candidate';
import { Interviewer } from '@/lib/features/user/userApi';
import { IGoogleCalendar, IZoomConfig } from '@/lib/models/settings';
import { InterviewerSelector } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/google-meet/GoogleMeetIntegration';
import { ZoomMeetIntegration } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/zoom-meet/ZoomMeetIntegration';
import { UnifiedFormValues } from './types';
import { AttachmentsSection } from './attachments-section';

interface AssignSectionProps {
  candidate: Candidate;
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  interviewers: Interviewer[] | undefined;
  googleCalendarData?: IGoogleCalendar;
  zoomConfig?: IZoomConfig;
  onRequestCancel: (provider: 'google' | 'zoom') => void;
  isBulkMode: boolean;
}

export function AssignSection({
  candidate,
  values,
  setFieldValue,
  interviewers,
  googleCalendarData,
  zoomConfig,
  onRequestCancel,
  isBulkMode,
}: AssignSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h3 className="text-base font-semibold text-foreground">Assign To</h3>
      </div>
      <div className="space-y-4">
        <div id="interviewerId">
          <InterviewerSelector interviewers={interviewers} />
        </div>
        <div id="time">
          <DateTimePickerSection />
        </div>
        {googleCalendarData ? (
          <GoogleMeetIntegration
            isBulkMode={isBulkMode}
            candidate={candidate}
            interviewers={interviewers}
            googleCalendarData={googleCalendarData}
            onRequestCancel={() => onRequestCancel('google')}
          />
        ) : null}
        {zoomConfig ? (
          <ZoomMeetIntegration
            isBulkMode={isBulkMode}
            candidate={candidate}
            interviewers={interviewers}
            zoomConfig={zoomConfig}
            onRequestCancel={() => onRequestCancel('zoom')}
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
