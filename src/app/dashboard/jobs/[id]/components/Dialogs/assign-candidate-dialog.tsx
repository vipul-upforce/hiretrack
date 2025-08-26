"use client";

import { useEffect, useState } from "react";
import { Formik, Form, Field, FieldProps } from "formik";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useFetchInterviewersQuery } from "@/lib/features/user/userApi";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { FileUpload } from "@/components/ui/file-upload";
import { Textarea } from "@/components/ui/textarea";
import { Rating } from "@mui/material";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import ConfirmationDialog from "./ConfirmationDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  X,
  UserPlus,
  Mail,
  Paperclip,
  FileIcon,
  Video,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGetGoogleCalendarConfigQuery } from "@/lib/features/settings/settingsApi";
import { handleFileSelect, handleSetter } from "../../hooks/fileUploadUtils";
import { useToast } from "@/hooks/use-toast";
import { FormikHelpers } from "formik";
import {
  validationSchema,
  FormValues,
  User,
  AssignCandidateDialogProps,
} from "../../schemas/AssignCandidateSchema";
import { useAssignCandidate } from "../../hooks/useAssignCandidate";
import dayjs from "dayjs";
import { useSanitizeFiles } from "@/hooks/useSanitizeFiles";
import { useSelector } from "react-redux";

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
  // const [user, setUser] = useState<User | null>(null);
  const [newGuest, setNewGuest] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showCancelMeetDialog, setShowCancelMeetDialog] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
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
  } = useAssignCandidate({
    candidate,
    refetch,
    onOpenChange,
    onUpdate,
    setLocalCandidate,
    refetchAssignment,
    onSuccess,
  });
  const { sanitizeFiles } = useSanitizeFiles();

  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setUser(decryptedResponse.user);
  //       }
  //     }
  //   })();
  // }, []);

  useEffect(() => {
    if (isOpen) {
      refetchInterviewers();
    }
  }, [isOpen, refetchInterviewers]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddGuest = (setFieldValue: any, currentGuests: string[]) => {
    if (!newGuest) {
      setEmailError("Please enter an email address");
      return;
    }

    if (!validateEmail(newGuest)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (currentGuests.includes(newGuest)) {
      setEmailError("This email is already in the guest list");
      return;
    }

    setFieldValue("additionalGuests", [...currentGuests, newGuest]);
    setNewGuest("");
    setEmailError("");
  };

  const handleRemoveGuest = (
    email: string,
    setFieldValue: any,
    currentGuests: string[]
  ) => {
    setFieldValue(
      "additionalGuests",
      currentGuests.filter((g) => g !== email)
    );
  };

  const getDefaultGuests = (selectedInterviewer: any) => {
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
      typeof candidate.assignment?.interviewerId === "string"
        ? candidate.assignment.interviewerId
        : candidate.assignment?.interviewerId?._id || "",
    time: candidate.assignment?.time
      ? dayjs(candidate?.assignment?.time)
      : null,
    remark: "",
    rating: null,
    attachments: [],
    scheduleGoogleMeet: false,
    meetDuration: 30,
    meetingNotes: candidate?.assignment?.googleMeet?.meetingNotes,
    meetingAttachments: [],
    additionalGuests: [],
  };

  const handleFormSubmit = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>
  ) => {
    // Check if Google Meet scheduling is requested
    if (values.scheduleGoogleMeet && values.time) {
      try {
        // Get selected interviewer details
        const selectedInterviewer = interviewers?.find(
          (i) => i._id === values.interviewerId
        );

        if (!selectedInterviewer) {
          toast({
            title: "Error",
            description: "Selected interviewer not found",
            variant: "destructive",
          });
          formikHelpers.setSubmitting(false);
          return;
        }

        // Prepare all guests (default + additional)
        const defaultGuests = getDefaultGuests(selectedInterviewer);
        const allGuests = [
          ...defaultGuests,
          ...(values.additionalGuests || []),
        ];

        // Convert meeting attachments to proper format with data URLs
        const processedMeetingAttachments = await Promise.all(
          (values.meetingAttachments || []).map(async (file: any) => {
            // If it's a File object, convert to data URL
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
            // If it already has the correct format, return as is
            return file;
          })
        );

        // Schedule or Update Google Meet
        const isUpdating = candidate.assignment?.googleMeet?.eventId;
        const apiUrl = isUpdating
          ? "/api/google-calendar/update-meet"
          : "/api/google-calendar/schedule-meet";
        const method = isUpdating ? "PUT" : "POST";

        const requestBody = isUpdating
          ? {
              eventId: candidate.assignment.googleMeet.eventId,
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
              jobTitle: candidate.jobId?.title || "Position",
              organizationName: user?.organizationInfo?.name || "Company",
              meetingNotes: values.meetingNotes || "",
              meetingAttachments: processedMeetingAttachments,
            };

        console.log("🚀 Making Google Meet API call:", {
          apiUrl,
          method,
          requestBody,
        });

        const response = await fetch(apiUrl, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        console.log("📡 API Response status:", response.status);
        console.log("📡 API Response ok:", response.ok);

        const result = await response.json();
        console.log("📊 API Response data:", result);

        if (!response.ok) {
          console.error("❌ API Error:", result.error);
          throw new Error(result.error || "Failed to schedule Google Meet");
        }

        // Add meeting link to remark and store Google Meet info

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

        // Proceed with assignment (this will now include Google Meet data)
        await handleSubmit(updatedValues, formikHelpers, user, interviewers);

        // Force refetch the candidate data to get updated Google Meet info
        if (refetch) {
          console.log("🔄 Refetching candidate data...");
          await refetch();
        }

        toast({
          title: "Success",
          description: isUpdating
            ? "Google Meet updated and candidate assigned"
            : "Google Meet scheduled and candidate assigned",
        });
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to schedule Google Meet",
          variant: "destructive",
        });
        formikHelpers.setSubmitting(false);
      }
    } else {
      // Proceed without Google Meet
      handleSubmit(values, formikHelpers, user, interviewers);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          size="lg"
          className="overflow-hidden flex flex-col justify-start"
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
            {({ values, errors, touched, isSubmitting, setFieldValue }) => (
              <Form className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="interviewerId">Assign To</Label>
                      <Field name="interviewerId">
                        {({ field }: FieldProps) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) =>
                              setFieldValue("interviewerId", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select interviewer" />
                            </SelectTrigger>
                            <SelectContent>
                              {interviewers?.map((interviewer) => (
                                <SelectItem
                                  key={interviewer._id}
                                  value={interviewer._id}
                                >
                                  {interviewer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                      {errors.interviewerId && touched.interviewerId && (
                        <div className="text-red-500 text-sm">
                          {errors.interviewerId}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="time">Time</Label>
                      <Field name="time">
                        {({ field }: FieldProps) => (
                          <DateTimePicker
                            value={field.value}
                            onChange={(date) => setFieldValue("time", date)}
                          />
                        )}
                      </Field>
                      {typeof errors.time === "string" && touched.time && (
                        <div className="text-red-500 text-sm">
                          {errors.time}
                        </div>
                      )}
                    </div>

                    {googleCalendarData?.googleCalendar?.isConnected && (
                      <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                        {/* Show existing Google Meet info if present */}
                        {candidate.assignment?.googleMeet &&
                          !values.scheduleGoogleMeet && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Video className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-sm">
                                    Google Meet Scheduled
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setFieldValue("scheduleGoogleMeet", true);
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
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
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Cancel Meet
                                  </Button>
                                </div>
                              </div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                                <div className="text-sm text-blue-900">
                                  <p className="font-medium">
                                    {candidate.assignment.googleMeet.summary}
                                  </p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    {
                                      candidate.assignment.googleMeet.description?.split(
                                        "\n"
                                      )[0]
                                    }
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={
                                      candidate.assignment.googleMeet
                                        .meetingLink
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
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
                                        candidate.assignment.googleMeet
                                          .meetingLink
                                      );
                                      toast({
                                        title: "Copied!",
                                        description:
                                          "Meeting link copied to clipboard",
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

                        {/* Show checkbox only if no existing meet or in edit mode */}
                        {(!candidate.assignment?.googleMeet ||
                          values.scheduleGoogleMeet) && (
                          <div className="flex items-center space-x-2">
                            <Field name="scheduleGoogleMeet">
                              {({ field }: FieldProps) => (
                                <Checkbox
                                  id="scheduleGoogleMeet"
                                  checked={field.value}
                                  onCheckedChange={(checked) =>
                                    setFieldValue("scheduleGoogleMeet", checked)
                                  }
                                />
                              )}
                            </Field>
                            <Label
                              htmlFor="scheduleGoogleMeet"
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Calendar className="h-4 w-4" />
                              {candidate.assignment?.googleMeet
                                ? "Update Google Meet"
                                : "Schedule Google Meet"}
                            </Label>
                          </div>
                        )}

                        {values.scheduleGoogleMeet && (
                          <div className="ml-6 space-y-3">
                            {/* Meeting Date/Time Display */}
                            {values.time && (
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-md">
                                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  <span className="font-medium">
                                    {values.time.format("dddd, MMMM D, YYYY")}{" "}
                                    at {values.time.format("h:mm A")}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Meeting Duration */}
                            <div className="flex items-center gap-3">
                              <Label
                                htmlFor="meetDuration"
                                className="text-sm font-medium"
                              >
                                Duration:
                              </Label>
                              <Field name="meetDuration">
                                {({ field }: FieldProps) => (
                                  <Select
                                    value={String(field.value)}
                                    onValueChange={(value) =>
                                      setFieldValue(
                                        "meetDuration",
                                        Number(value)
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8">
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
                                  <Textarea
                                    {...field}
                                    placeholder="Add notes to include in the meeting description..."
                                    rows={2}
                                    className="text-sm"
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
                                  const selectedInterviewer =
                                    interviewers?.find(
                                      (i) => i._id === values.interviewerId
                                    );
                                  const defaultGuests =
                                    getDefaultGuests(selectedInterviewer);

                                  return defaultGuests.map((email) => {
                                    let role = "";
                                    let roleColor =
                                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                                    if (email === candidate.email) {
                                      role = "Candidate";
                                      roleColor =
                                        "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400";
                                    } else if (
                                      email === selectedInterviewer?.email
                                    ) {
                                      role = "Interviewer";
                                      roleColor =
                                        "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400";
                                    } else if (email === user?.email) {
                                      role = "HR";
                                      roleColor =
                                        "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400";
                                    }

                                    return (
                                      <div
                                        key={email}
                                        className="flex items-center gap-2 p-1.5 rounded border border-gray-200 dark:border-gray-700 bg-background text-xs"
                                      >
                                        <Mail className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                        <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                                          {email}
                                        </span>
                                        {role && (
                                          <Badge
                                            variant="secondary"
                                            className={`text-xs px-1 py-0 ${roleColor} border-0`}
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
                              <Label className="text-sm font-medium">
                                Additional Guests
                              </Label>

                              {/* Existing Additional Guests */}
                              {values.additionalGuests &&
                                values.additionalGuests.length > 0 && (
                                  <div className="space-y-1">
                                    {values.additionalGuests.map(
                                      (email, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center gap-2 p-1.5 rounded border border-gray-200 bg-white text-xs"
                                        >
                                          <Mail className="h-3 w-3 text-gray-500" />
                                          <span className="text-gray-900 truncate flex-1">
                                            {email}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              handleRemoveGuest(
                                                email,
                                                setFieldValue,
                                                values.additionalGuests || []
                                              )
                                            }
                                            className="text-gray-400 hover:text-red-500 h-5 w-5 p-0"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </Button>
                                        </div>
                                      )
                                    )}
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
                                      setEmailError("");
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddGuest(
                                          setFieldValue,
                                          values.additionalGuests || []
                                        );
                                      }
                                    }}
                                    className={`flex-1 text-sm h-8 ${emailError ? "border-red-500" : "border-gray-300"}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                      handleAddGuest(
                                        setFieldValue,
                                        values.additionalGuests || []
                                      )
                                    }
                                    className="h-8 w-8 p-0"
                                    size="sm"
                                  >
                                    <UserPlus className="h-3 w-3" />
                                  </Button>
                                </div>
                                {emailError && (
                                  <p className="text-xs text-red-500">
                                    {emailError}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Meeting Attachments */}
                            <div className="space-y-1">
                              <Label className="text-sm">
                                Meeting Attachments (Optional)
                              </Label>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 h-8"
                                    onClick={() => {
                                      const input =
                                        document.createElement("input");
                                      input.type = "file";
                                      input.multiple = true;
                                      input.onchange = (e) => {
                                        const files = (
                                          e.target as HTMLInputElement
                                        ).files;
                                        if (files && files.length > 0) {
                                          // Use only values.meetingAttachments for form state
                                          const currentFiles =
                                            values.meetingAttachments || [];
                                          const sanitizedFiles = sanitizeFiles(
                                            Array.from(files)
                                          );

                                          // Ensure we don't exceed 10 files total
                                          const availableSlots = Math.max(
                                            0,
                                            10 - currentFiles.length
                                          );
                                          setFieldValue("meetingAttachments", [
                                            ...currentFiles,
                                            ...sanitizedFiles.slice(
                                              0,
                                              availableSlots
                                            ),
                                          ]);
                                        }
                                      };
                                      input.click();
                                    }}
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    Add Files
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    Max 10 files
                                  </span>
                                </div>

                                {(() => {
                                  const formAttachments =
                                    values.meetingAttachments || [];
                                  const candidateAttachments =
                                    candidate?.assignment?.googleMeet
                                      ?.meetingAttachments || [];

                                  // If form has attachments, use those; otherwise show candidate attachments
                                  const displayAttachments = [
                                    ...formAttachments,
                                    ...candidateAttachments,
                                  ];
                                  // formAttachments.length > 0
                                  //   ? formAttachments
                                  //   : candidateAttachments;

                                  return (
                                    displayAttachments.length > 0 && (
                                      <div className="space-y-1">
                                        {displayAttachments.map(
                                          (file: any, index: number) => (
                                            <div
                                              key={`${file.name}-${index}`}
                                              className="flex items-center justify-between p-1.5 bg-white dark:bg-black border border-gray-200 rounded text-xs"
                                            >
                                              <div className="flex items-center gap-1">
                                                <FileIcon className="w-3 h-3 text-gray-500" />
                                                <span className="truncate">
                                                  {file.name}
                                                </span>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  // Always work with form values when removing
                                                  const currentFormFiles =
                                                    values.meetingAttachments ||
                                                    [];

                                                  if (
                                                    currentFormFiles.length > 0
                                                  ) {
                                                    // Remove from form attachments
                                                    const updatedFiles =
                                                      currentFormFiles.filter(
                                                        (_: any, i: number) =>
                                                          i !== index
                                                      );
                                                    setFieldValue(
                                                      "meetingAttachments",
                                                      updatedFiles
                                                    );
                                                  } else {
                                                    // If we're showing candidate attachments, copy them to form and remove the selected one
                                                    const candidateFiles =
                                                      candidate?.assignment
                                                        ?.googleMeet
                                                        ?.meetingAttachments ||
                                                      [];
                                                    const updatedFiles =
                                                      candidateFiles.filter(
                                                        (_: any, i: number) =>
                                                          i !== index
                                                      );
                                                    setFieldValue(
                                                      "meetingAttachments",
                                                      updatedFiles
                                                    );
                                                  }
                                                }}
                                                className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </Button>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <Field name="remark">
                        {({ field }: FieldProps) => (
                          <Textarea placeholder="Add a remark..." {...field} />
                        )}
                      </Field>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="rating">Rating:</Label>
                          <Field name="rating">
                            {({ field }: { field: { value: number } }) => (
                              <Rating
                                name="rating"
                                value={field.value}
                                onChange={(e, value) =>
                                  setFieldValue("rating", value)
                                }
                                precision={0.5}
                              />
                            )}
                          </Field>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Attachments</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 h-8"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.multiple = true;
                              input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement)
                                  .files;
                                if (files && files.length > 0) {
                                  const sanitizedFiles = sanitizeFiles(
                                    Array.from(files)
                                  );
                                  handleFileSelect({
                                    files: sanitizedFiles,
                                    existingAttachments: candidate.attachments,
                                    currentFormAttachments: values.attachments,
                                    setFieldValue,
                                  });
                                }
                              };
                              input.click();
                            }}
                          >
                            <Paperclip className="w-3 h-3" />
                            Add Files
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Max 30 files
                          </span>
                        </div>

                        {values.attachments &&
                          values.attachments.length > 0 && (
                            <div className="space-y-1">
                              {values.attachments.map(
                                (att: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-1.5 bg-white dark:bg-black border border-gray-200 rounded text-xs"
                                  >
                                    <div className="flex items-center gap-1">
                                      <FileIcon className="w-3 h-3 text-gray-500" />
                                      <span className="truncate">
                                        {att.name}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updatedFiles =
                                          values.attachments?.filter(
                                            (_: any, i: number) => i !== index
                                          );
                                        setFieldValue(
                                          "attachments",
                                          updatedFiles
                                        );
                                      }}
                                      className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </Button>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex relative bottom-0 justify-between w-full space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10">
                  <div>
                    {candidate.assignment && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUnassign}
                      >
                        Mark As Done
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
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
                      {isSubmitting ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                </div>
              </Form>
            )}
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

      {/* Cancel Meeting Dialog */}
      {showCancelMeetDialog && (
        <Dialog
          open={showCancelMeetDialog}
          onOpenChange={setShowCancelMeetDialog}
        >
          <DialogContent className="sm:max-w-md p-6">
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
                  setCancelNotes("");
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
                      { method: "DELETE" }
                    );
                    if (response.ok) {
                      toast({
                        title: "Success",
                        description: "Google Meet cancelled successfully",
                      });
                      refetch();
                      onOpenChange(false);
                      setShowCancelMeetDialog(false);
                      setCancelNotes("");
                    } else {
                      throw new Error("Failed to cancel meeting");
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to cancel Google Meet",
                      variant: "destructive",
                    });
                  } finally {
                    setIsCancelling(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isCancelling ? "Cancelling..." : "Cancel Meeting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
