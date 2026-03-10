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
import { IGoogleCalendar } from '@/lib/models/settings';
import { Interviewer } from '@/lib/features/user/userApi';
import { GoogleMeetSummaryCard } from './GoogleMeetSummaryCard';
import { MeetingAttachmentsSection } from './MeetingAttachmentsSection';
import { useGoogleMeetIntegration } from './useGoogleMeetIntegration';

interface GoogleMeetIntegrationProps {
  candidate: Candidate;
  interviewers: Interviewer[] | undefined;
  googleCalendarData: IGoogleCalendar;
  onRequestCancel: () => void;
  isBulkMode: boolean;
  showScheduleToggle?: boolean;
}

export function GoogleMeetIntegration({
  candidate,
  interviewers,
  googleCalendarData,
  onRequestCancel,
  isBulkMode,
  showScheduleToggle = true,
}: GoogleMeetIntegrationProps) {
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
  } = useGoogleMeetIntegration({ candidate });

  if (!googleCalendarData?.isConnected) {
    return null;
  }

  const hasOtherMeeting =
    !!candidate.assignment?.zoomMeet?.meetingId ||
    !!candidate.assignment?.microsoftTeams?.meetingId;
  if (!hasExistingMeet && hasOtherMeeting) {
    return null;
  }

  if (!showScheduleToggle && !hasExistingMeet && !values.scheduleGoogleMeet) {
    return null;
  }

  if (isBulkMode) {
    return (
      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center space-x-2 opacity-60">
          <Checkbox disabled id="scheduleGoogleMeet" checked={false} />
          <Label
            htmlFor="scheduleGoogleMeet"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Schedule Google Meet
          </Label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {/* LOGIC FIX: Show summary card if Meet exists and not editing */}
      {hasExistingMeet && !isEditMode && (
        <GoogleMeetSummaryCard
          candidate={candidate}
          onEdit={() => {
            setIsEditMode(true);
            setFieldValue('scheduleGoogleMeet', true);
            setFieldValue('scheduleZoomMeet', false);
            setFieldValue('scheduleTeamsMeet', false);
          }}
          onCancelMeet={onRequestCancel}
        />
      )}

      {/* LOGIC FIX: Show scheduling form if no meet, or editing */}
      {(!hasExistingMeet || isEditMode) && (
        <>
          {/* Only show the checkbox for NEW scheduling (never when editing); users can't unschedule here */}
          {!hasExistingMeet && showScheduleToggle && (
            <div className="flex items-center space-x-2">
              <Field name="scheduleGoogleMeet">
                {({ field }: FieldProps) => (
                  <Checkbox
                    disabled={isBulkMode}
                    id="scheduleGoogleMeet"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      setFieldValue('scheduleGoogleMeet', checked);
                      if (checked) {
                        setFieldValue('scheduleZoomMeet', false);
                        setFieldValue('scheduleTeamsMeet', false);
                      }
                    }}
                  />
                )}
              </Field>
              <Label
                htmlFor="scheduleGoogleMeet"
                className="flex cursor-pointer items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule Google Meet
              </Label>
            </div>
          )}

          {/* Only show the actual form fields if checkbox is checked OR we're forced edit mode */}
          {values.scheduleGoogleMeet && (
            <div className="space-y-3">
              {/* Add ability to leave editing mode */}
              {isEditMode && hasExistingMeet && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      Google Meet Scheduled
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode(false);
                        // setFieldValue("scheduleGoogleMeet", true);
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
                      onClick={() => {
                        onRequestCancel();
                      }}
                      className="h-7 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Cancel Meet
                    </Button>
                  </div>
                </div>
              )}

              {/* Meeting Date/Time Display */}
              {values.time && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-2 dark:bg-blue-900/20">
                  <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">
                      {values.time.format('dddd, MMMM D, YYYY')} at{' '}
                      {values.time.format('h:mm A')}
                    </span>
                  </div>
                </div>
              )}

              {/* Meeting Duration */}
              <div className="flex items-center gap-3">
                <Label htmlFor="meetDuration" className="text-sm font-medium">
                  Duration:
                </Label>
                <Field name="meetDuration">
                  {({ field }: FieldProps) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) =>
                        setFieldValue('meetDuration', Number(value))
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

              {/* Meeting Notes */}
              <div className="space-y-1">
                <Label htmlFor="meetingNotes" className="text-sm">
                  Meeting Notes (Optional)
                </Label>
                <Field name="meetingNotes">
                  {({ field }: FieldProps) => (
                    <MentionTextarea
                      value={field.value || ''}
                      onChange={(value: string) =>
                        setFieldValue('meetingNotes', value)
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

              {/* Default Participants */}
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
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
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

              {/* Additional Guests */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Additional Guests</Label>

                {/* Existing Additional Guests */}
                {values.additionalGuests &&
                  values.additionalGuests.length > 0 && (
                    <div className="space-y-1">
                      {values.additionalGuests.map((email) => (
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

                {/* Add Guest Input */}
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

              {/* Meeting Attachments */}
              <MeetingAttachmentsSection
                meetingAttachments={values.meetingAttachments}
                onAttachmentsChange={(updatedFiles) =>
                  setFieldValue('meetingAttachments', updatedFiles)
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
