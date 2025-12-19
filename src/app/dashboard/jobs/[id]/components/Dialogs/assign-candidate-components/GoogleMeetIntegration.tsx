import { Field, FieldProps, useFormikContext, FormikProps } from 'formik';
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
import { Interviewer } from '@/lib/features/user/userApi';
import { useState } from 'react';
import { useSanitizeFiles } from '@/hooks/useSanitizeFiles';
import { FormValues, User } from '../../../schemas/AssignCandidateSchema';

interface GoogleMeetIntegrationProps {
  candidate: Candidate;
  user: User | null;
  interviewers: Interviewer[] | undefined;
  googleCalendarData: any;
  setShowCancelMeetDialog: (show: boolean) => void;
  getOnAltEnterSubmit: (
    values: FormValues,
    formikHelpers: FormikProps<FormValues>,
    isSubmitting: boolean,
  ) => (fieldValue: string) => (e: React.KeyboardEvent) => void;
  isSubmitting: boolean;
  formikProps: FormikProps<FormValues>;
}

export function GoogleMeetIntegration({
  candidate,
  user,
  interviewers,
  googleCalendarData,
  setShowCancelMeetDialog,
  getOnAltEnterSubmit,
}: GoogleMeetIntegrationProps) {
  const formikContext = useFormikContext<FormValues>();
  const { values, setFieldValue, isSubmitting } = formikContext;
  const [isEditMode, setIsEditMode] = useState(false);
  const [newGuest, setNewGuest] = useState('');
  const [emailError, setEmailError] = useState('');
  const { sanitizeFiles: contextSanitizeFiles } = useSanitizeFiles();
  // Prioritize sanitizeFiles from context, fallback to hook.
  const { sanitizeFiles: localSanitizeFiles } = useSanitizeFiles();
  const sanitizeFiles = contextSanitizeFiles || localSanitizeFiles;

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddGuest = () => {
    if (!newGuest) {
      setEmailError('Please enter an email address');
      return;
    }
    if (!validateEmail(newGuest)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    const currentGuests = values.additionalGuests || [];
    if (currentGuests.includes(newGuest)) {
      setEmailError('This email is already in the guest list');
      return;
    }
    setFieldValue('additionalGuests', [...currentGuests, newGuest]);
    setNewGuest('');
    setEmailError('');
  };

  const handleRemoveGuest = (email: string) => {
    const currentGuests = values.additionalGuests || [];
    setFieldValue(
      'additionalGuests',
      currentGuests.filter((g) => g !== email),
    );
  };

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

  const hasExistingMeet = !!candidate.assignment?.googleMeet?.eventId;

  if (!googleCalendarData?.isConnected) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      {/* LOGIC FIX: Show summary card if Meet exists and not editing */}
      {hasExistingMeet && !isEditMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Google Meet Scheduled</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditMode(true);
                  setFieldValue('scheduleGoogleMeet', true);
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
                onClick={() => {
                  setShowCancelMeetDialog(true);
                }}
                className="h-7 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Cancel Meet
              </Button>
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-gray-800 dark:bg-black">
            <div className="text-sm text-blue-900 dark:text-blue-500">
              <p className="font-medium">
                {candidate.assignment?.googleMeet?.summary}
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-600">
                {candidate.assignment?.googleMeet?.description?.split('\n')[0]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={candidate.assignment?.googleMeet?.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-200"
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
                    candidate.assignment?.googleMeet?.meetingLink || '',
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

      {/* LOGIC FIX: Show scheduling form if no meet, or editing */}
      {(!hasExistingMeet || isEditMode) && (
        <>
          {/* Only show the checkbox for NEW scheduling (never when editing); users can't unschedule here */}
          {!hasExistingMeet && (
            <div className="flex items-center space-x-2">
              <Field name="scheduleGoogleMeet">
                {({ field }: FieldProps) => (
                  <Checkbox
                    id="scheduleGoogleMeet"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      setFieldValue('scheduleGoogleMeet', checked)
                    }
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
                        setShowCancelMeetDialog(true);
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
                      onKeyDown={getOnAltEnterSubmit(
                        values,
                        formikContext,
                        isSubmitting,
                      )(field.value)}
                      organizationId={user?.organizationInfo?._id || ''}
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
                    const defaultGuests = getDefaultGuests(selectedInterviewer);

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
                      {values.additionalGuests.map((email, index) => (
                        <div
                          key={index}
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
                      className={`h-8 flex-1 text-sm ${
                        emailError ? 'border-red-500' : 'border-gray-300'
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
                            values.meetingAttachments,
                          )
                            ? values.meetingAttachments
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
                          setFieldValue('meetingAttachments', updatedFiles);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Paperclip className="h-3 w-3" />
                    Add Files
                  </Button>

                  {values.meetingAttachments &&
                    values.meetingAttachments.length > 0 && (
                      <ul className="space-y-2">
                        {values.meetingAttachments.map(
                          (file: any, index: number) => (
                            <li
                              key={`${file.name}-${index}`}
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
                                    values.meetingAttachments?.filter(
                                      (_: any, i: number) => i !== index,
                                    );
                                  setFieldValue(
                                    'meetingAttachments',
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
