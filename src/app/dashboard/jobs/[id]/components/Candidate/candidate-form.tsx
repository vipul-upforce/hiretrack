"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChipInput } from "@/components/ui/chip-input";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useField, useFormikContext } from "formik";
import type { CandidateFormValues } from "../../schemas/candidate-schema";
import { useFetchInterviewersQuery } from "@/lib/features/user/userApi";
import { v4 as uuidv4 } from "uuid";
import CustomFields from "@/Custom_Fields/Components/CustomFields";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import { MobileFileUpload } from "@/components/ui/file-upload-mobile";
import { useSanitizeFiles } from "@/hooks/useSanitizeFiles";
import { useSelector } from "react-redux";
import { normalizeCTCToLPA, formatCTCAsLPA } from "@/lib/ctc-normalizer";
import { ResumePreviewSection } from "./candidate-form-components/resume-preview-section";

interface CandidateFormProps {
  onFileUpload?: (file: File) => Promise<string | void>; // Prop to handle file upload to a persistent storage
  isEditMode?: boolean;
  jobId?: string;
}

export function CandidateForm({
  onFileUpload,
  isEditMode = false,
  jobId,
}: CandidateFormProps) {
  const {
    setFieldValue,
    values,
    errors,
    setTouched,
    submitCount,
  } = useFormikContext<CandidateFormValues>();
  const { data: interviewers } = useFetchInterviewersQuery();
  const [nameField, nameMeta] = useField("name");
  const [locationField, locationMeta] = useField("location");
  const [experienceField, experienceMeta] = useField("experience");
  const [relevantExperienceField, relevantExperienceMeta] =
    useField("relevantExperience");
  const [skillsField, skillsMeta] = useField("skills");
  const [expectedCTCField, expectedCTCMeta] = useField("expectedCTC");
  const [currentCTCField, currentCTCMeta] = useField("currentCTC");
  const [noticePeriodField, noticePeriodMeta] = useField("noticePeriod");
  const [resumeField, resumeMeta] = useField("resume");
  const [attachmentsField] = useField("attachments");
  const [timeTouched, setTimeTouched] = useState(false);
  const [tempResumeUrl, setTempResumeUrl] = useState<string | null>(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null); // State to track only blob URLs for cleanup
  const [emailField, emailMeta] = useField("email");
  const [contactField, contactMeta] = useField("contact");
  const { user } = useSelector((state: any) => state.auth || {});
  const formRef = useRef<HTMLDivElement>(null);
  const { sanitizeFiles } = useSanitizeFiles();

  // State to track converted CTC values
  const [convertedExpectedCTC, setConvertedExpectedCTC] = useState<
    number | null
  >(null);
  const [convertedCurrentCTC, setConvertedCurrentCTC] = useState<number | null>(
    null
  );
  const [showExpectedCTCWarning, setShowExpectedCTCWarning] = useState(false);
  const [showCurrentCTCWarning, setShowCurrentCTCWarning] = useState(false);

  // Handle form submission and apply CTC conversions
  useEffect(() => {
    // When form is about to be submitted, apply the converted CTC values
    if (submitCount > 0) {
      // Apply converted values for API submission
      if (convertedExpectedCTC !== null) {
        setFieldValue("expectedCTC", convertedExpectedCTC);
      }

      if (convertedCurrentCTC !== null) {
        setFieldValue("currentCTC", convertedCurrentCTC);
      }

      // Handle form errors
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstErrorKey = errorKeys[0];

        if (firstErrorKey === "customFields") {
          // HANDLED BY HANDLEAPPLY SCROLLER
          return;
        }

        const fieldContainer = formRef.current?.querySelector<HTMLElement>(
          `[data-form-field="${firstErrorKey}"]`
        );

        if (fieldContainer) {
          fieldContainer.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          const inputElement = fieldContainer.querySelector<HTMLElement>(
            'input, textarea, select, [role="combobox"]'
          );
          if (inputElement) {
            inputElement.focus({ preventScroll: true });
          }
        }
      }
    }
  }, [
    submitCount,
    errors,
    convertedExpectedCTC,
    convertedCurrentCTC,
    setFieldValue,
  ]);

  // Get the current interviewer ID from the assignment
  const currentInterviewerId =
    typeof values.assignment?.interviewerId === "string"
      ? values.assignment.interviewerId
      : values.assignment?.interviewerId?._id || "";

  useEffect(() => {
    // Cleanup previous blob URL if it exists
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      setCurrentBlobUrl(null); // Clear it after revoking
    }

    const resumeValue = values.resume as { url?: string };
    if (resumeValue) {
      if (values.resume instanceof File) {
        // For immediate client-side preview of newly selected files
        const newBlobUrl = URL.createObjectURL(values.resume);
        setTempResumeUrl(newBlobUrl);
        setCurrentBlobUrl(newBlobUrl); // Store the blob URL for cleanup
      } else if ("url" in resumeValue && resumeValue.url) {
        // For persistent preview from a public URL (e.g., after upload)
        setTempResumeUrl(resumeValue.url);
      }
    } else {
      setTempResumeUrl(null);
    }

    // Cleanup on unmount
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [values.resume]); // Only depend on values.resume

  return (
    <div className="w-full h-full flex flex-col" ref={formRef}>
      {/* Mobile Layout - Stacked */}
      <div className="flex flex-col h-full lg:hidden">
        {/* Form Section - Mobile */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Resume Upload */}
          <div className="space-y-3">
            <Label className="font-semibold">
              Resume <span className="text-red-500">*</span>
            </Label>
            
            <MobileFileUpload
              accept={{ "application/pdf": [".pdf"] }}
              onFileSelect={async (files) => {
                if (!user && files[0].size > 3 * 1024 * 1024) {
                  toast({
                    title: `File "${files[0].name}" exceeds 3MB. Please upload a smaller file.`,
                    variant: "destructive",
                  });
                  return false;
                }
                if (
                  user &&
                  (user.role === "candidate" || user.role === "") &&
                  files[0].size > 3 * 1024 * 1024
                ) {
                  toast({
                    title:
                      "File size exceeds 3MB. Please upload a smaller file.",
                    variant: "destructive",
                  });
                  return;
                }
                if (
                  user &&
                  ["hr", "admin", "interviewer"].includes(user.role) &&
                  files[0].size > 50 * 1024 * 1024
                ) {
                  toast({
                    title:
                      "File size exceeds 3MB. Please upload a smaller file.",
                    variant: "destructive",
                  });
                  return;
                }
                const sanitizedFiles = sanitizeFiles(files);
                setFieldValue("resume", sanitizedFiles[0]); // Set the File object for form submission

                // Create a temporary blob URL for immediate client-side preview
                setTempResumeUrl(URL.createObjectURL(sanitizedFiles[0]));

                if (onFileUpload) {
                  await onFileUpload(sanitizedFiles[0]);
                }
                setTimeout(() => {
                  setTouched({
                    name: false,
                    location: false,
                    experience: true,
                    relevantExperience: true,
                    skills: true,
                    expectedCTC: true,
                    currentCTC: true,
                    noticePeriod: true,
                    // resume: true,
                    email: false,
                  });
                }, 100);
              }}
              files={resumeField.value ? [resumeField.value] : []}
              setter={(files) => {
                const sanitizedFiles = sanitizeFiles(files);
                setFieldValue("resume", sanitizedFiles[0]);
              }}
              buttonText="Add Resume"
            />

            {resumeMeta.touched && resumeMeta.error && (
              <div className="text-sm text-destructive">{resumeMeta.error}</div>
            )}
          </div>

          {/* Personal Information Grid - Mobile */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter name"
                {...nameField}
                className={
                  nameMeta.error && nameMeta.touched ? "border-red-500" : ""
                }
              />
              {nameMeta.touched && nameMeta.error && (
                <p className="text-sm text-red-500">{nameMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                {...emailField}
                className={
                  emailMeta.error && emailMeta.touched ? "border-red-500" : ""
                }
              />
              {emailMeta.touched && emailMeta.error && (
                <p className="text-sm text-red-500">{emailMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact" className="font-semibold">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact"
                type="tel"
                placeholder="Enter contact number"
                {...contactField}
                className={
                  contactMeta.error && contactMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {contactMeta.touched && contactMeta.error && (
                <p className="text-sm text-red-500">{contactMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="font-semibold">
                Current Location <span className="text-red-500">*</span>
              </Label>
              <Input
                id="location"
                placeholder="Enter Location"
                {...locationField}
                className={
                  locationMeta.error && locationMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {locationMeta.touched && locationMeta.error && (
                <p className="text-sm text-red-500">{locationMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="relevantExperience" className="font-semibold">
                Relevant Exp in Years <span className="text-red-500">*</span>
              </Label>
              <Input
                id="relevantExperience"
                placeholder="Enter relevant experience in years"
                type="number"
                step="0.01"
                {...relevantExperienceField}
                className={
                  relevantExperienceMeta.error && relevantExperienceMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {relevantExperienceMeta.touched &&
                relevantExperienceMeta.error && (
                  <p className="text-sm text-red-500">
                    {relevantExperienceMeta.error}
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="font-semibold">
                Total Exp in Years <span className="text-red-500">*</span>
              </Label>
              <Input
                id="experience"
                placeholder="Enter total experience in years"
                type="number"
                step="0.01"
                {...experienceField}
                className={
                  experienceMeta.error && experienceMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {experienceMeta.touched && experienceMeta.error && (
                <p className="text-sm text-red-500">{experienceMeta.error}</p>
              )}
            </div>
          </div>

          {/* Skills - Mobile */}
          <div className="space-y-2">
            <Label className="font-semibold">
              Skills (Type and press Enter, comma, or space){" "}
              <span className="text-red-500">*</span>
            </Label>
            <ChipInput
              placeholder="Type skills separated by comma, space, or press Enter"
              value={skillsField.value}
              onChange={(skills) => setFieldValue("skills", skills)}
              onSuggestionClick={(suggestion) => {
                setFieldValue("skills", [...skillsField.value, suggestion]);
              }}
              showAddButton={true}
            />
            {skillsMeta.touched && skillsMeta.error && (
              <p className="text-sm text-red-500">{skillsMeta.error}</p>
            )}
          </div>

          {/* CTC and Notice Period - Mobile */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-col">
                <Label htmlFor="expectedCTC" className="font-semibold">
                  Expected CTC (LPA) <span className="text-red-500">*</span>
                </Label>
              </div>
              <Input
                id="expectedCTC"
                placeholder="in LPA..."
                type="text"
                {...expectedCTCField}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Allow empty field or valid number input with commas
                  if (inputValue === "" || /^[\d,.\s]*$/.test(inputValue)) {
                    setFieldValue("expectedCTC", inputValue);

                    // Calculate converted value but don't set it in the field yet
                    if (inputValue) {
                      const normalizedValue = normalizeCTCToLPA(inputValue);
                      setConvertedExpectedCTC(normalizedValue);
                      setShowExpectedCTCWarning(true);
                    } else {
                      setShowExpectedCTCWarning(false);
                    }
                  }
                }}
                onBlur={(e) => {
                  // Keep the original value in the field
                  // The converted value will be used when submitting the form
                  if (e.target.value) {
                    const normalizedValue = normalizeCTCToLPA(e.target.value);
                    setConvertedExpectedCTC(normalizedValue);
                    setShowExpectedCTCWarning(true);
                  } else {
                    setShowExpectedCTCWarning(false);
                  }
                }}
                className={
                  expectedCTCMeta.error && expectedCTCMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {expectedCTCMeta.touched && expectedCTCMeta.error && (
                <p className="text-sm text-red-500">{expectedCTCMeta.error}</p>
              )}
              {showExpectedCTCWarning && convertedExpectedCTC !== null && (
                <p className="text-sm text-orange-500 flex items-center gap-1 mt-1">
                  <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                  Will be saved as {formatCTCAsLPA(convertedExpectedCTC)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-col">
                <Label htmlFor="currentCTC" className="font-semibold">
                  Current CTC (LPA) <span className="text-red-500">*</span>
                </Label>
              </div>
              <Input
                id="currentCTC"
                placeholder="in LPA..."
                type="text"
                {...currentCTCField}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Allow empty field or valid number input with commas
                  if (inputValue === "" || /^[\d,.\s]*$/.test(inputValue)) {
                    setFieldValue("currentCTC", inputValue);

                    // Calculate converted value but don't set it in the field yet
                    if (inputValue) {
                      const normalizedValue = normalizeCTCToLPA(inputValue);
                      setConvertedCurrentCTC(normalizedValue);
                      setShowCurrentCTCWarning(true);
                    } else {
                      setShowCurrentCTCWarning(false);
                    }
                  }
                }}
                onBlur={(e) => {
                  // Keep the original value in the field
                  // The converted value will be used when submitting the form
                  if (e.target.value) {
                    const normalizedValue = normalizeCTCToLPA(e.target.value);
                    setConvertedCurrentCTC(normalizedValue);
                    setShowCurrentCTCWarning(true);
                  } else {
                    setShowCurrentCTCWarning(false);
                  }
                }}
                className={
                  currentCTCMeta.error && currentCTCMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {currentCTCMeta.touched && currentCTCMeta.error && (
                <p className="text-sm text-red-500">{currentCTCMeta.error}</p>
              )}
              {showCurrentCTCWarning && convertedCurrentCTC !== null && (
                <p className="text-sm text-orange-500 flex items-center gap-1 mt-1">
                  <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                  Will be saved as {formatCTCAsLPA(convertedCurrentCTC)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="noticePeriod" className="font-semibold">
                Notice Period (days) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="noticePeriod"
                placeholder="in days..."
                type="number"
                {...noticePeriodField}
                className={
                  noticePeriodMeta.error && noticePeriodMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {noticePeriodMeta.touched && noticePeriodMeta.error && (
                <p className="text-sm text-red-500">{noticePeriodMeta.error}</p>
              )}
            </div>
          </div>

          {/* Custom Fields - Mobile */}
          <CustomFields
            formName="Candidate"
            isEditMode={isEditMode}
            jobId={jobId}
          />

          {/* Assignment Section - Mobile */}
          {user && user.role !== "candidate" && user.role !== "" && (
            <div className="space-y-4 border-t pt-4">
              <Label className="text-lg font-semibold">Assignment</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={currentInterviewerId}
                    onValueChange={(value) =>
                      setFieldValue("assignment.interviewerId", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 9999 }}>
                      <SelectItem value="-1">None</SelectItem>
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
                  {errors?.assignment && (
                    <p className="text-sm text-red-500">
                      {String(
                        errors.assignment[
                          "interviewerId" as keyof typeof errors.assignment
                        ] || ""
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <DateTimePicker
                    value={
                      values.assignment?.time
                        ? dayjs(values.assignment?.time)
                        : null
                    }
                    onChange={(date) => {
                      setFieldValue("assignment.time", date);
                      setTimeTouched(true);
                    }}
                    placeholder="Select time"
                  />
                  {timeTouched &&
                    values.assignment?.time &&
                    new Date(values.assignment?.time) < new Date() && (
                      <p className="text-sm text-orange-500">
                        Assignment date should not be in past
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Attachments - Mobile */}
          <div className="space-y-3">
            <Label className="font-semibold">Additional Attachments</Label>

            <MobileFileUpload
              accept={{}}
              maxFiles={
                (user && (user.role === "candidate" || user.role === "")) ||
                !user
                  ? 2
                  : 30
              }
              onFileSelect={(files) => {
                const sanitizedFiles = sanitizeFiles(files);
                const currentFiles = attachmentsField.value || [];

                const newFiles = sanitizedFiles
                  .filter((file) => {
                    if (!user && file.size > 3 * 1024 * 1024) {
                      toast({
                        title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
                        variant: "destructive",
                      });
                      return false;
                    }
                    if (
                      user &&
                      user.role === "candidate" &&
                      file.size > 3 * 1024 * 1024
                    ) {
                      toast({
                        title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
                        variant: "destructive",
                      });
                      return false;
                    }
                    if (
                      user &&
                      ["hr", "admin", "interviewer"].includes(user.role) &&
                      file.size > 50 * 1024 * 1024
                    ) {
                      toast({
                        title: `File "${file.name}" exceeds 50MB. Please upload a smaller file.`,
                        variant: "destructive",
                      });
                      return false;
                    }
                    return true;
                  })
                  .map((file) => {
                    let newFileName = file.name;

                    const fileExists = currentFiles.some(
                      (att: File) => att.name === file.name
                    );

                    if (fileExists) {
                      const fileExtension = file.name.split(".").pop();
                      const baseName = file.name.replace(/\.[^/.]+$/, "");
                      newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
                    }

                    return new File([file], newFileName, { type: file.type });
                  });

                const updatedFileSelection = [...currentFiles, ...newFiles];
                if (
                  user &&
                  updatedFileSelection.length > 2 &&
                  (user.role === "candidate" || user.role === "")
                ) {
                  toast({
                    title: "Maximum 2 files are allowed",
                    variant: "destructive",
                  });
                  return;
                }
                setFieldValue("attachments", updatedFileSelection);
              }}
              files={attachmentsField.value}
              setter={(files) => {
                const sanitizedFiles = sanitizeFiles(files);
                setFieldValue("attachments", sanitizedFiles);
              }}
              buttonText="Add Attachments"
            />
          </div>

          {/* Bottom padding for mobile to ensure content is accessible */}
          <div className="h-24"></div>
        </div>
      </div>

      {/* Desktop Layout - Side by Side */}
      <div className="hidden lg:flex lg:flex-row lg:gap-6 lg:flex-1 lg:h-full lg:overflow-hidden">
        {/* Form Section - Desktop */}
        <div className="w-1/2 space-y-4 overflow-y-auto px-3 py-3">
          {/* Resume Upload */}
          <div className="space-y-3" data-form-field="resume">
            <Label className="font-semibold">
              Resume <span className="text-red-500">*</span>
            </Label>

            <FileUpload
              id="resume"
              isResume={true}
              colorScheme="green" // Use green for resume uploads
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
              onFileSelect={async (files) => {
                const sanitizedFiles = sanitizeFiles(files);
                if (!user && files[0].size > 3 * 1024 * 1024) {
                  toast({
                    title: `File "${files[0].name}" exceeds 3MB. Please upload a smaller file.`,
                    variant: "destructive",
                  });
                  return false;
                }
                if (
                  user &&
                  (user.role === "candidate" || user.role === "") &&
                  files[0].size > 3 * 1024 * 1024
                ) {
                  toast({
                    title:
                      "File size exceeds 3MB. Please upload a smaller file.",
                    variant: "destructive",
                  });
                  return;
                }
                if (
                  user &&
                  ["hr", "admin", "interviewer"].includes(user.role) &&
                  files[0].size > 50 * 1024 * 1024
                ) {
                  toast({
                    title:
                      "File size exceeds 3MB. Please upload a smaller file.",
                    variant: "destructive",
                  });
                  return;
                }
                setFieldValue("resume", sanitizedFiles[0]); // Set the File object for form submission

                // Create a temporary blob URL for immediate client-side preview
                setTempResumeUrl(URL.createObjectURL(sanitizedFiles[0]));

                // Call onFileUpload to handle the actual upload to a persistent storage (e.g., Vercel Blob)
                // The parent component should update `values.resume` with the public URL returned from the upload
                // For example: const publicUrl = await onFileUpload(files[0]);
                // if (publicUrl) { setFieldValue("resume", { url: publicUrl }); }
                if (onFileUpload) {
                  await onFileUpload(sanitizedFiles[0]);
                }
                setTimeout(() => {
                  setTouched({
                    name: false,
                    location: false,
                    experience: true,
                    relevantExperience: true,
                    skills: true,
                    expectedCTC: true,
                    currentCTC: true,
                    noticePeriod: true,
                    // resume: true,
                    email: false,
                  });
                }, 100);
              }}
              files={resumeField.value ? [resumeField.value] : []}
              setter={(files) => {
                const sanitizedFiles = sanitizeFiles(files);
                setFieldValue("resume", sanitizedFiles[0]);
              }}
            />

            {resumeMeta.touched && resumeMeta.error && (
              <div className="text-sm text-destructive">{resumeMeta.error}</div>
            )}
          </div>

          {/* Personal Information Section - Desktop */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Personal Information
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2" data-form-field="name">
                <Label
                  htmlFor="name"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  {...nameField}
                  className={`h-9 px-3 transition-all duration-200 ${
                    nameMeta.error && nameMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {nameMeta.touched && nameMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {nameMeta.error}
                  </p>
                )}
              </div>

              <div className="space-y-2" data-form-field="email">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  {...emailField}
                  className={`h-9 px-3 transition-all duration-200 ${
                    emailMeta.error && emailMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {emailMeta.touched && emailMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {emailMeta.error}
                  </p>
                )}
              </div>

              <div className="space-y-2" data-form-field="contact">
                <Label
                  htmlFor="contact"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contact"
                  type="tel"
                  placeholder="Enter contact number"
                  {...contactField}
                  className={`h-9 px-3 transition-all duration-200 ${
                    contactMeta.error && contactMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {contactMeta.touched && contactMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {contactMeta.error}
                  </p>
                )}
              </div>

              <div className="space-y-2" data-form-field="location">
                <Label
                  htmlFor="location"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Current Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  placeholder="Enter location"
                  {...locationField}
                  className={`h-9 px-3 transition-all duration-200 ${
                    locationMeta.error && locationMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {locationMeta.touched && locationMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {locationMeta.error}
                  </p>
                )}
              </div>

              <div
                className="space-y-2 col-span-1"
                data-form-field="relevantExperience"
              >
                <Label
                  htmlFor="relevantExperience"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Relevant Exp in Years <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="relevantExperience"
                  placeholder="Enter relevant experience in years"
                  type="number"
                  step="0.1"
                  {...relevantExperienceField}
                  className={`h-9 px-3 transition-all duration-200 w-full max-w-xs ${
                    relevantExperienceMeta.error &&
                    relevantExperienceMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {relevantExperienceMeta.touched &&
                  relevantExperienceMeta.error && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {relevantExperienceMeta.error}
                    </p>
                  )}
              </div>

              <div
                className="space-y-2 col-span-1"
                data-form-field="experience"
              >
                <Label
                  htmlFor="experience"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Total Exp in Years <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="experience"
                  placeholder="Enter total experience in years"
                  type="number"
                  step="0.1"
                  {...experienceField}
                  className={`h-9 px-3 transition-all duration-200 w-full max-w-xs ${
                    experienceMeta.error && experienceMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {experienceMeta.touched && experienceMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {experienceMeta.error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Skills Section - Desktop */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Technical Skills
              </h3>
            </div>
            <div className="space-y-2" id="skills" data-form-field="skills">
              <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Skills (Type and press Enter, comma, or space){" "}
                <span className="text-red-500">*</span>
              </Label>
              <ChipInput
                placeholder="Type skills separated by comma, space, or press Enter"
                value={skillsField.value}
                onChange={(skills) => setFieldValue("skills", skills)}
                onSuggestionClick={(suggestion) => {
                  setFieldValue("skills", [...skillsField.value, suggestion]);
                }}
              />
              {skillsMeta.touched && skillsMeta.error && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {skillsMeta.error}
                </p>
              )}
            </div>
          </div>

          {/* Professional Details Section - Desktop */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Professional Details
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2" data-form-field="expectedCTC">
                <div className="flex flex-col">
                  <Label
                    htmlFor="expectedCTC"
                    className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                  >
                    Expected CTC (LPA) <span className="text-red-500">*</span>
                  </Label>
                </div>
                <Input
                  id="expectedCTC"
                  placeholder="Enter expected CTC in LPA"
                  type="text"
                  {...expectedCTCField}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Allow empty field or valid number input with commas
                    if (inputValue === "" || /^[\d,.\s]*$/.test(inputValue)) {
                      setFieldValue("expectedCTC", inputValue);

                      // Calculate converted value but don't set it in the field yet
                      if (inputValue) {
                        const normalizedValue = normalizeCTCToLPA(inputValue);
                        setConvertedExpectedCTC(normalizedValue);
                        setShowExpectedCTCWarning(true);
                      } else {
                        setShowExpectedCTCWarning(false);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Keep the original value in the field
                    // The converted value will be used when submitting the form
                    if (e.target.value) {
                      const normalizedValue = normalizeCTCToLPA(e.target.value);
                      setConvertedExpectedCTC(normalizedValue);
                      setShowExpectedCTCWarning(true);
                    } else {
                      setShowExpectedCTCWarning(false);
                    }
                  }}
                  className={`h-9 px-3 transition-all duration-200 ${
                    expectedCTCMeta.error && expectedCTCMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {expectedCTCMeta.touched && expectedCTCMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {expectedCTCMeta.error}
                  </p>
                )}
                {showExpectedCTCWarning && convertedExpectedCTC !== null && (
                  <p className="text-sm text-orange-500 flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                    Will be saved as {formatCTCAsLPA(convertedExpectedCTC)}
                  </p>
                )}
              </div>

              <div className="space-y-2" data-form-field="currentCTC">
                <div className="flex flex-col">
                  <Label
                    htmlFor="currentCTC"
                    className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                  >
                    Current CTC (LPA) <span className="text-red-500">*</span>
                  </Label>
                  {/* <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Enter as LPA (e.g., 10), annual (e.g., 10,00,000), or
                    monthly (e.g., 40,000)
                  </span> */}
                </div>
                <Input
                  id="currentCTC"
                  placeholder="Enter current CTC in LPA"
                  type="text"
                  {...currentCTCField}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Allow empty field or valid number input with commas
                    if (inputValue === "" || /^[\d,.\s]*$/.test(inputValue)) {
                      setFieldValue("currentCTC", inputValue);

                      // Calculate converted value but don't set it in the field yet
                      if (inputValue) {
                        const normalizedValue = normalizeCTCToLPA(inputValue);
                        setConvertedCurrentCTC(normalizedValue);
                        setShowCurrentCTCWarning(true);
                      } else {
                        setShowCurrentCTCWarning(false);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Keep the original value in the field
                    // The converted value will be used when submitting the form
                    if (e.target.value) {
                      const normalizedValue = normalizeCTCToLPA(e.target.value);
                      setConvertedCurrentCTC(normalizedValue);
                      setShowCurrentCTCWarning(true);
                    } else {
                      setShowCurrentCTCWarning(false);
                    }
                  }}
                  className={`h-9 px-3 transition-all duration-200 ${
                    currentCTCMeta.error && currentCTCMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {currentCTCMeta.touched && currentCTCMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {currentCTCMeta.error}
                  </p>
                )}
                {showCurrentCTCWarning && convertedCurrentCTC !== null && (
                  <p className="text-sm text-orange-500 flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                    Will be saved as {formatCTCAsLPA(convertedCurrentCTC)}
                  </p>
                )}
              </div>

              <div
                className="space-y-2 col-span-2"
                data-form-field="noticePeriod"
              >
                <Label
                  htmlFor="noticePeriod"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  Notice Period (days) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="noticePeriod"
                  placeholder="Enter notice period in days"
                  type="number"
                  {...noticePeriodField}
                  className={`h-9 px-3 transition-all duration-200 w-full max-w-xs ${
                    noticePeriodMeta.error && noticePeriodMeta.touched
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {noticePeriodMeta.touched && noticePeriodMeta.error && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {noticePeriodMeta.error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Custom Fields - Desktop */}
          <CustomFields
            formName="Candidate"
            isEditMode={isEditMode}
            jobId={jobId}
          />

          {/* Assignment Section - Desktop */}
          {user && user.role !== "candidate" && user.role != "" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Interview Assignment
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Assign To
                  </Label>
                  <Select
                    value={currentInterviewerId}
                    onValueChange={(value) =>
                      setFieldValue("assignment.interviewerId", value)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 9999 }}>
                      <SelectItem value="-1">None</SelectItem>
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
                  {errors?.assignment && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {String(
                        errors.assignment[
                          "interviewerId" as keyof typeof errors.assignment
                        ] || ""
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Interview Time
                  </Label>
                  <DateTimePicker
                    value={
                      values.assignment?.time
                        ? dayjs(values.assignment?.time)
                        : null
                    }
                    onChange={(date) => {
                      setFieldValue("assignment.time", date);
                      setTimeTouched(true);
                    }}
                    placeholder="Select interview time"
                  />
                  {timeTouched &&
                    values.assignment?.time &&
                    new Date(values.assignment?.time) < new Date() && (
                      <p className="text-sm text-orange-500 flex items-center gap-1">
                        <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                        Assignment date should not be in past
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Attachments Section - Desktop */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                Additional Documents
              </h3>
            </div>

            <FileUpload
              accept={{}}
              maxFiles={
                (user && (user.role === "candidate" || user.role === "")) ||
                !user
                  ? 2
                  : 30
              }
              isEdit={true}
              onFileSelect={(files) => {
                const currentFiles = attachmentsField.value || [];
                const sanitizedFiles = sanitizeFiles(files);
                const newFiles = sanitizedFiles
                  .filter((file) => {
                    if (!user && file.size > 3 * 1024 * 1024) {
                      toast({
                        title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
                        variant: "destructive",
                      });
                      return false;
                    }
                    if (
                      user &&
                      (user.role === "candidate" || user.role === "") &&
                      file.size > 3 * 1024 * 1024
                    ) {
                      toast({
                        title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
                        variant: "destructive",
                      });
                      return false;
                    }
                    if (
                      user &&
                      ["hr", "admin", "interviewer"].includes(user.role) &&
                      file.size > 50 * 1024 * 1024
                    ) {
                      toast({
                        title: `File "${file.name}" exceeds 50MB. Please upload a smaller file.`,
                        variant: "destructive",
                      });
                      return false;
                    }

                    return true;
                  })
                  .map((file) => {
                    let newFileName = file.name;

                    const fileExists = currentFiles.some(
                      (att: File) => att.name === file.name
                    );

                    if (fileExists) {
                      const fileExtension = file.name.split(".").pop();
                      const baseName = file.name.replace(/\.[^/.]+$/, "");
                      newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
                    }

                    return new File([file], newFileName, { type: file.type });
                  });

                const updatedFileSelection = [...currentFiles, ...newFiles];
                if (
                  user &&
                  updatedFileSelection.length > 2 &&
                  (user.role === "candidate" || user.role === "")
                ) {
                  toast({
                    title: "Maximum 2 files are allowed",
                    variant: "destructive",
                  });
                  return;
                }
                setFieldValue("attachments", updatedFileSelection);
              }}
              files={attachmentsField.value}
              setter={(files) => {
                const sanitizedFiles = sanitizeFiles(files);
                setFieldValue("attachments", sanitizedFiles);
              }}
            />
          </div>
        </div>

       <ResumePreviewSection tempResumeUrl={tempResumeUrl} />
      </div>
    </div>
  );
}
