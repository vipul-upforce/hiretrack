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
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Calendar,
  Mail,
  UserPlus,
  X,
  Paperclip,
  FileIcon,
  PenOffIcon,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Candidate } from '@/types/candidate';
import { IZoomConfig } from '@/lib/models/settings';
import { Interviewer } from '@/lib/features/user/userApi';
import { useZoomMeetIntegration } from './useZoomMeetIntegration';

interface ZoomMeetIntegrationProps {
  candidate: Candidate;
  interviewers: Interviewer[] | undefined;
  zoomConfig: IZoomConfig;
  onRequestCancel: () => void;
  isBulkMode: boolean;
}

export function ZoomMeetIntegration({
  candidate,
  interviewers,
  zoomConfig,
  onRequestCancel,
  isBulkMode,
}: ZoomMeetIntegrationProps) {
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
  } = useZoomMeetIntegration({ candidate });

  if (!zoomConfig?.isConnected) {
    return null;
  }

  const hasOtherMeeting =
    !!candidate.assignment?.googleMeet?.eventId ||
    !!candidate.assignment?.microsoftTeams?.meetingId;
  if (!hasExistingMeet && hasOtherMeeting) {
    return null;
  }

  if (isBulkMode) {
    return (
      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center space-x-2 opacity-60">
          <Checkbox disabled id="scheduleZoomMeet" checked={false} />
          <Label htmlFor="scheduleZoomMeet" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Zoom Meeting
          </Label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {hasExistingMeet && !isEditMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-medium">Zoom Scheduled</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditMode(true);
                  setFieldValue('scheduleZoomMeet', true);
                  setFieldValue('scheduleGoogleMeet', false);
                  setFieldValue('scheduleTeamsMeet', false);
                }}
                className="h-7 text-xs"
              >
                <Edit className="mr-1 h-3 w-3" />
                Edit
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
          <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50 p-3 dark:border-gray-800 dark:bg-black">
            <div className="text-sm text-sky-900 dark:text-sky-500">
              <p className="font-medium">
                {candidate.assignment?.zoomMeet?.summary || 'Zoom Interview'}
              </p>
              <p className="mt-1 text-xs text-sky-700 dark:text-sky-600">
                {candidate.assignment?.zoomMeet?.description?.split('\n')[0]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={candidate.assignment?.zoomMeet?.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-sky-600 underline hover:text-sky-700 dark:text-sky-200"
              >
                <ExternalLink className="h-3 w-3" />
                Join Meeting
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    candidate.assignment?.zoomMeet?.meetingLink || '',
                  );
                  toast({
                    title: 'Copied!',
                    description: 'Meeting link copied to clipboard',
                    duration: 2000,
                  });
                }}
                className="h-6 text-xs"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {(!hasExistingMeet || isEditMode) && (
        <>
          {!hasExistingMeet && (
            <div className="flex items-center space-x-2">
              <Field name="scheduleZoomMeet">
                {({ field }: FieldProps) => (
                  <Checkbox
                    disabled={isBulkMode}
                    id="scheduleZoomMeet"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      setFieldValue('scheduleZoomMeet', checked);
                      if (checked) {
                        setFieldValue('scheduleGoogleMeet', false);
                        setFieldValue('scheduleTeamsMeet', false);
                      }
                    }}
                  />
                )}
              </Field>
              <Label
                htmlFor="scheduleZoomMeet"
                className="flex cursor-pointer items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule Zoom Meeting
              </Label>
            </div>
          )}

          {values.scheduleZoomMeet && (
            <div className="space-y-3">
              {isEditMode && hasExistingMeet && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-sky-500" />
                    <span className="text-sm font-medium">Zoom Scheduled</span>
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
                <div className="rounded-md border border-sky-200 bg-sky-50 p-2 dark:bg-sky-900/20">
                  <div className="flex items-center gap-2 text-sm text-sky-800 dark:text-sky-300">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">
                      {values.time.format('dddd, MMMM D, YYYY')} at{' '}
                      {values.time.format('h:mm A')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Label htmlFor="zoomMeetDuration" className="text-sm font-medium">
                  Duration:
                </Label>
                <Field name="zoomMeetDuration">
                  {({ field }: FieldProps) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(value) =>
                        setFieldValue('zoomMeetDuration', Number(value))
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="40">40 min</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              </div>

              <div className="space-y-1">
                <Label htmlFor="zoomMeetingNotes" className="text-sm">
                  Meeting Notes (Optional)
                </Label>
                <Field name="zoomMeetingNotes">
                  {({ field }: FieldProps) => (
                    <MentionTextarea
                      value={field.value || ''}
                      onChange={(value: string) =>
                        setFieldValue('zoomMeetingNotes', value)
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
                          'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400';
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

                {values.zoomAdditionalGuests &&
                  values.zoomAdditionalGuests.length > 0 && (
                    <div className="space-y-1">
                      {values.zoomAdditionalGuests.map((email) => (
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

              <div className="space-y-1">
                <Label className="text-sm">
                  Meeting Attachments (Optional)
                </Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex h-8 items-center gap-2"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.onchange = (e) => {
                        const { files } = e.target as HTMLInputElement;
                        if (files && files.length > 0) {
                          const currentFormFiles = Array.isArray(
                            values.zoomMeetingAttachments,
                          )
                            ? values.zoomMeetingAttachments
                            : [];
                          const allFiles = [...currentFormFiles];
                          const sanitizedNewFiles = sanitizeFiles(
                            Array.from(files),
                          );
                          const availableSlots = Math.max(
                            0,
                            10 - allFiles.length,
                          );
                          const updatedFiles = [
                            ...allFiles,
                            ...sanitizedNewFiles.slice(0, availableSlots),
                          ];
                          setFieldValue(
                            'zoomMeetingAttachments',
                            updatedFiles,
                          );
                        }
                      };
                      input.click();
                    }}
                  >
                    <Paperclip className="h-3 w-3" />
                    Add Files
                  </Button>

                  {values.zoomMeetingAttachments &&
                    values.zoomMeetingAttachments.length > 0 && (
                      <ul className="space-y-2">
                        {values.zoomMeetingAttachments.map(
                          (file, index: number) => (
                            <li
                              key={`${file.name}`}
                              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                                <span
                                  className="max-w-[200px] truncate text-sm text-gray-900 dark:text-gray-100"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                                {file.size && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updatedFiles =
                                    values.zoomMeetingAttachments?.filter(
                                      (_, i: number) => i !== index,
                                    );
                                  setFieldValue(
                                    'zoomMeetingAttachments',
                                    updatedFiles,
                                  );
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
