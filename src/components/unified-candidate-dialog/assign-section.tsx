import React from 'react';
import { Candidate } from '@/types/candidate';
import { Interviewer } from '@/lib/features/user/userApi';
import {
  IGoogleCalendar,
  IZoomConfig,
  IMicrosoftTeamsConfig,
} from '@/lib/models/settings';
import { InterviewerSelector } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/InterviewerSelector';
import { DateTimePickerSection } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/DateTimePickerSection';
import { GoogleMeetIntegration } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/google-meet/GoogleMeetIntegration';
import { ZoomMeetIntegration } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/zoom-meet/ZoomMeetIntegration';
import { TeamsMeetIntegration } from '@/app/dashboard/jobs/[id]/components/Dialogs/assign-candidate-components/teams-meet/TeamsMeetIntegration';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UnifiedFormValues } from './types';
import { AttachmentsSection } from './attachments-section';

interface AssignSectionProps {
  candidate: Candidate;
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  interviewers: Interviewer[] | undefined;
  googleCalendarData?: IGoogleCalendar;
  zoomConfig?: IZoomConfig;
  teamsConfig?: IMicrosoftTeamsConfig;
  onRequestCancel: (provider: 'google' | 'zoom' | 'teams') => void;
  isBulkMode: boolean;
}

export function AssignSection({
  candidate,
  values,
  setFieldValue,
  interviewers,
  googleCalendarData,
  zoomConfig,
  teamsConfig,
  onRequestCancel,
  isBulkMode,
}: AssignSectionProps) {
  const isGoogleConnected = !!googleCalendarData?.isConnected;
  const isZoomConnected = !!zoomConfig?.isConnected;
  const isTeamsConnected = !!teamsConfig?.isConnected;

  const hasGoogleMeeting = !!candidate.assignment?.googleMeet?.eventId;
  const hasZoomMeeting = !!candidate.assignment?.zoomMeet?.meetingId;
  const hasTeamsMeeting = !!candidate.assignment?.microsoftTeams?.meetingId;

  let existingProvider: 'google' | 'zoom' | 'teams' | null = null;
  if (hasGoogleMeeting) {
    existingProvider = 'google';
  } else if (hasZoomMeeting) {
    existingProvider = 'zoom';
  } else if (hasTeamsMeeting) {
    existingProvider = 'teams';
  }

  const meetingOptions = [
    {
      id: 'google',
      label: 'Google Meet',
      enabled: isGoogleConnected && (!existingProvider || existingProvider === 'google'),
      checked: !!values.scheduleGoogleMeet || existingProvider === 'google',
    },
    {
      id: 'zoom',
      label: 'Zoom Meeting',
      enabled: isZoomConnected && (!existingProvider || existingProvider === 'zoom'),
      checked: !!values.scheduleZoomMeet || existingProvider === 'zoom',
    },
    {
      id: 'teams',
      label: 'Microsoft Teams',
      enabled: isTeamsConnected && (!existingProvider || existingProvider === 'teams'),
      checked: !!values.scheduleTeamsMeet || existingProvider === 'teams',
    },
  ].filter((option) => option.enabled);

  const meetingCount = meetingOptions.length;
  let activeProvider: 'google' | 'zoom' | 'teams' | null = existingProvider;
  if (!activeProvider) {
    if (values.scheduleGoogleMeet) {
      activeProvider = 'google';
    } else if (values.scheduleZoomMeet) {
      activeProvider = 'zoom';
    } else if (values.scheduleTeamsMeet) {
      activeProvider = 'teams';
    }
  }

  const handleMeetingToggle = (provider: string, checked: boolean) => {
    if (provider === 'google') {
      setFieldValue('scheduleGoogleMeet', checked);
      setFieldValue('scheduleZoomMeet', false);
      setFieldValue('scheduleTeamsMeet', false);
      return;
    }
    if (provider === 'zoom') {
      setFieldValue('scheduleGoogleMeet', false);
      setFieldValue('scheduleZoomMeet', checked);
      setFieldValue('scheduleTeamsMeet', false);
      return;
    }
    if (provider === 'teams') {
      setFieldValue('scheduleGoogleMeet', false);
      setFieldValue('scheduleZoomMeet', false);
      setFieldValue('scheduleTeamsMeet', checked);
    }
  };

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
        {(() => {
          if (meetingCount > 1) {
            return (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">
                  Schedule Meeting
                </div>
                {!existingProvider && (
                  <div className="flex flex-wrap gap-3">
                    {meetingOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex flex-1 basis-0 min-w-[220px] cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/40"
                      >
                        <Checkbox
                          id={`meeting-${option.id}`}
                          checked={option.checked}
                          onCheckedChange={(checked) =>
                            handleMeetingToggle(option.id, Boolean(checked))
                          }
                          disabled={isBulkMode}
                        />
                        <Label
                          htmlFor={`meeting-${option.id}`}
                          className="cursor-pointer text-sm font-medium"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {activeProvider === 'google' && googleCalendarData ? (
                  <GoogleMeetIntegration
                    isBulkMode={isBulkMode}
                    candidate={candidate}
                    interviewers={interviewers}
                    googleCalendarData={googleCalendarData}
                    onRequestCancel={() => onRequestCancel('google')}
                    showScheduleToggle={false}
                  />
                ) : null}
                {activeProvider === 'zoom' && zoomConfig ? (
                  <ZoomMeetIntegration
                    isBulkMode={isBulkMode}
                    candidate={candidate}
                    interviewers={interviewers}
                    zoomConfig={zoomConfig}
                    onRequestCancel={() => onRequestCancel('zoom')}
                    showScheduleToggle={false}
                  />
                ) : null}
                {activeProvider === 'teams' && teamsConfig ? (
                  <TeamsMeetIntegration
                    isBulkMode={isBulkMode}
                    candidate={candidate}
                    interviewers={interviewers}
                    teamsConfig={teamsConfig}
                    onRequestCancel={() => onRequestCancel('teams')}
                    showScheduleToggle={false}
                  />
                ) : null}
              </div>
            );
          }

          if (meetingCount === 1) {
            return (
              <>
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
                {teamsConfig ? (
                  <TeamsMeetIntegration
                    isBulkMode={isBulkMode}
                    candidate={candidate}
                    interviewers={interviewers}
                    teamsConfig={teamsConfig}
                    onRequestCancel={() => onRequestCancel('teams')}
                  />
                ) : null}
              </>
            );
          }

          return null;
        })()}
        <AttachmentsSection
          candidate={candidate}
          values={values}
          setFieldValue={setFieldValue}
        />
      </div>
    </div>
  );
}
