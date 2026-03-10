import { Field, FieldProps } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import {
  Video,
  Trash2,
  Calendar,
  Mail,
  UserPlus,
  X,
  PenOffIcon,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { IMicrosoftTeamsConfig } from '@/lib/models/settings';
import { Interviewer } from '@/lib/features/user/userApi';
import { useTeamsMeetIntegration } from './useTeamsMeetIntegration';
import { TeamsMeetSummaryCard } from './TeamsMeetSummaryCard';
import { MeetingAttachmentsSection } from '../google-meet/MeetingAttachmentsSection';

interface TeamsMeetIntegrationProps {
  candidate: Candidate;
  interviewers: Interviewer[] | undefined;
  teamsConfig: IMicrosoftTeamsConfig;
  onRequestCancel: () => void;
  isBulkMode: boolean;
  showScheduleToggle?: boolean;
}

export function TeamsMeetIntegration({
  candidate,
  interviewers,
  teamsConfig,
  onRequestCancel,
  isBulkMode,
  showScheduleToggle = true,
}: TeamsMeetIntegrationProps) {
  const {
    user,
    values,
    setFieldValue,
    isEditMode,
    setIsEditMode,
    newGuest,
    setNewGuest,
    emailError,
    setEmailError,
    sanitizeFiles,
    getOnAltEnterSubmit,
    handleAddGuest,
    handleRemoveGuest,
    getDefaultGuests,
    hasExistingMeet,
  } = useTeamsMeetIntegration({ candidate });

  if (!teamsConfig?.isConnected) {
    return null;
  }

  const hasOtherMeeting =
    !!candidate.assignment?.googleMeet?.eventId ||
    !!candidate.assignment?.zoomMeet?.meetingId;
  if (!hasExistingMeet && hasOtherMeeting) {
    return null;
  }

  if (!showScheduleToggle && !hasExistingMeet && !values.scheduleTeamsMeet) {
    return null;
  }

  if (isBulkMode) {
    return (
      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center space-x-2 opacity-60">
          <Checkbox disabled id="scheduleTeamsMeet" checked={false} />
          <Label htmlFor="scheduleTeamsMeet" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Microsoft Teams Meeting
          </Label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {hasExistingMeet && !isEditMode && (
        <TeamsMeetSummaryCard
          candidate={candidate}
          onEdit={() => {
            setIsEditMode(true);
            setFieldValue('scheduleTeamsMeet', true);
            setFieldValue('scheduleGoogleMeet', false);
            setFieldValue('scheduleZoomMeet', false);
          }}
          onCancelMeet={onRequestCancel}
        />
      )}

      {(!hasExistingMeet || isEditMode) && (
        <>
          {!hasExistingMeet && showScheduleToggle && (
            <div className="flex items-center space-x-2">
              <Field name="scheduleTeamsMeet">
                {({ field }: FieldProps) => (
                  <Checkbox
                    disabled={isBulkMode}
                    id="scheduleTeamsMeet"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      setFieldValue('scheduleTeamsMeet', checked);
                      if (checked) {
                        setFieldValue('scheduleGoogleMeet', false);
                        setFieldValue('scheduleZoomMeet', false);
                      }
                    }}
                  />
                )}
              </Field>
              <Label
                htmlFor="scheduleTeamsMeet"
                className="flex cursor-pointer items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule Microsoft Teams Meeting
              </Label>
            </div>
          )}

          {values.scheduleTeamsMeet && (
            <div className="space-y-3">
              {isEditMode && hasExistingMeet && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">
                      Microsoft Teams Scheduled
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode(false);
                      }}
                      className="h-7 text-xs"
                    >
                      <PenOffIcon className="mr-1 h-3 w-3" />
                      Cancel Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onRequestCancel}
                      className="h-7 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Cancel Meet
                    </Button>
                  </div>
                </div>
              )}

              {values.time && (
                <div className="rounded-md border border-purple-200 bg-purple-50 p-2 dark:bg-purple-900/20">
                  <div className="flex items-center gap-2 text-sm text-purple-800 dark:text-purple-300">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">
                      {values.time.format('dddd, MMMM D, YYYY')} at{' '}
                      {values.time.format('h:mm A')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Label htmlFor="teamsMeetDuration" className="text-sm font-medium">
                  Duration:
                </Label>
                <Field name="teamsMeetDuration">
                  {({ field }: FieldProps) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) =>
                        setFieldValue('teamsMeetDuration', Number(value))
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="45">45 min</SelectItem>
                        <SelectItem value="60">60 min</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </div>

              <div className="space-y-1">
                <Label htmlFor="teamsMeetingNotes" className="text-sm">
                  Meeting Notes (Optional)
                </Label>
                <Field name="teamsMeetingNotes">
                  {({ field }: FieldProps) => (
                    <MentionTextarea
                      value={field.value || ''}
                      onChange={(value: string) =>
                        setFieldValue('teamsMeetingNotes', value)
                      }
                      placeholder="Add notes to include in the meeting description... (Alt+Enter to submit)"
                      rows={2}
                      className="text-sm"
                      onKeyDown={getOnAltEnterSubmit}
                      organizationId={
                        user?.organizationInfo?._id.toString() || ''
                      }
                      currentUserRole={user?.role || ''}
                    />
                  )}
                </Field>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Default Participants
                </Label>
                <div className="space-y-1">
                  {(() => {
                    const selectedInterviewer = interviewers?.find(
                      (i) => i._id === values.interviewerId,
                    );
                    const defaultGuests = getDefaultGuests(
                      selectedInterviewer as Interviewer,
                    );

                    return defaultGuests.map((email) => {
                      let role = '';
                      let roleColor =
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                      if (email === candidate.email) {
                        role = 'Candidate';
                        roleColor =
                          'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
                      } else if (email === selectedInterviewer?.email) {
                        role = 'Interviewer';
                        roleColor =
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400';
                      } else if (email === user?.email) {
                        role = user?.role === 'hr' ? 'HR' : 'Admin';
                        roleColor =
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400';
                      }

                      return (
                        <div
                          key={email}
                          className="flex items-center gap-2 rounded border border-gray-200 bg-background p-1.5 text-xs dark:border-gray-700"
                        >
                          <Mail className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                          <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                            {email}
                          </span>
                          {role && (
                            <Badge
                              variant="secondary"
                              className={`px-1 py-0 text-xs ${roleColor} border-0`}
                            >
                              {role}
                            </Badge>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Additional Guests</Label>

                {values.teamsAdditionalGuests &&
                  values.teamsAdditionalGuests.length > 0 && (
                    <div className="space-y-1">
                      {values.teamsAdditionalGuests.map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-2 rounded border border-gray-200 bg-white p-1.5 text-xs"
                        >
                          <Mail className="h-3 w-3 text-gray-500" />
                          <span className="flex-1 truncate text-gray-900">
                            {email}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveGuest(email)}
                            className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newGuest}
                      onChange={(e) => {
                        setNewGuest(e.target.value);
                        setEmailError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGuest();
                        }
                      }}
                      className={`h-8 flex-1 text-sm ${emailError ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddGuest}
                      className="h-8 w-8 p-0"
                      size="sm"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                </div>
              </div>

              <MeetingAttachmentsSection
                  meetingAttachments={values.teamsMeetingAttachments}
                  onAttachmentsChange={(updatedFiles) =>
                    setFieldValue('teamsMeetingAttachments', updatedFiles)
                  }
                  sanitizeFiles={sanitizeFiles}
                />
            </div>
          )}
        </>
      )}
    </div>
  );
}
