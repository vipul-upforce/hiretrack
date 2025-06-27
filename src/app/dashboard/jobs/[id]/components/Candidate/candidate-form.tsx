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
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import type { User } from "@/lib/features/org/orgApi";
import dayjs from "dayjs";
import { MobileFileUpload } from "@/components/ui/file-upload-mobile";

interface CandidateFormProps {
  onFileUpload?: (file: File) => Promise<string | void>; // Prop to handle file upload to a persistent storage
  isEditMode?: boolean;
}

export function CandidateForm({
  onFileUpload,
  isEditMode = false,
}: CandidateFormProps) {
  const { setFieldValue, values, errors, setTouched } =
    useFormikContext<CandidateFormValues>();
  const { data: interviewers } = useFetchInterviewersQuery();
  const [nameField, nameMeta] = useField("name");
  const [locationField, locationMeta] = useField("location");
  const [experienceField, experienceMeta] = useField("experience");
  const [skillsField, skillsMeta] = useField("skills");
  const [expectedCTCField, expectedCTCMeta] = useField("expectedCTC");
  const [currentCTCField, currentCTCMeta] = useField("currentCTC");
  const [noticePeriodField, noticePeriodMeta] = useField("noticePeriod");
  const [resumeField, resumeMeta] = useField("resume");
  const [attachmentsField] = useField("attachments");
  const [tempResumeUrl, setTempResumeUrl] = useState<string | null>(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null); // State to track only blob URLs for cleanup
  const [emailField, emailMeta] = useField("email");
  const [user, setuser] = useState<User | null>(null);

  // Get the current interviewer ID from the assignment
  const currentInterviewerId =
    typeof values.assignment?.interviewerId === "string"
      ? values.assignment.interviewerId
      : values.assignment?.interviewerId?._id || "";

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setuser(decryptedResponse.user);
        }
      }
    })();
  }, []);

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
    <div className="w-full h-full flex flex-col">
      {/* Mobile Layout - Stacked */}
      <div className="flex flex-col h-full lg:hidden">
        {/* Form Section - Mobile */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Resume Upload */}
          <div className="space-y-2">
            <Label>
              Resume <span className="text-red-500">*</span>
            </Label>
            <MobileFileUpload
              accept={{}}
              maxFiles={user && user.role === "candidate" ? 2 : 30}
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
                  user.role === "candidate" &&
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
                setFieldValue("resume", files[0]); // Set the File object for form submission

                // Create a temporary blob URL for immediate client-side preview
                setTempResumeUrl(URL.createObjectURL(files[0]));

                // Call onFileUpload to handle the actual upload to a persistent storage (e.g., Vercel Blob)
                // The parent component should update `values.resume` with the public URL returned from the upload
                // For example: const publicUrl = await onFileUpload(files[0]);
                // if (publicUrl) { setFieldValue("resume", { url: publicUrl }); }
                if (onFileUpload) {
                  await onFileUpload(files[0]);
                }
                setTimeout(() => {
                  setTouched({
                    name: true,
                    location: true,
                    experience: true,
                    skills: true,
                    expectedCTC: true,
                    currentCTC: true,
                    noticePeriod: true,
                    resume: true,
                    email: true,
                  });
                }, 100);
              }}
              files={resumeField.value ? [resumeField.value] : []}
              setter={(files) => setFieldValue("resume", files[0])}
              buttonText="Add Resume"
            />

            {resumeMeta.touched && resumeMeta.error && (
              <div className="text-sm text-destructive">{resumeMeta.error}</div>
            )}
          </div>

          {/* Personal Information Grid - Mobile */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
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
              <Label htmlFor="email">
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
              <Label htmlFor="location">
                Location <span className="text-red-500">*</span>
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
              <Label htmlFor="experience">Experience (years)</Label>
              <Input
                id="experience"
                placeholder="Enter experience in years..."
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
            <Label>
              Skills (Hit Enter to Add) <span className="text-red-500">*</span>
            </Label>
            <ChipInput
              placeholder="Hit Enter to Add"
              value={skillsField.value}
              onChange={(skills) => setFieldValue("skills", skills)}
              onSuggestionClick={(suggestion) => {
                setFieldValue("skills", [...skillsField.value, suggestion]);
              }}
            />
            {skillsMeta.touched && skillsMeta.error && (
              <p className="text-sm text-red-500">{skillsMeta.error}</p>
            )}
          </div>

          {/* CTC and Notice Period - Mobile */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expectedCTC">Expected CTC (LPA)</Label>
              <Input
                id="expectedCTC"
                placeholder="in LPA..."
                type="number"
                {...expectedCTCField}
                className={
                  expectedCTCMeta.error && expectedCTCMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {expectedCTCMeta.touched && expectedCTCMeta.error && (
                <p className="text-sm text-red-500">{expectedCTCMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentCTC">Current CTC (LPA)</Label>
              <Input
                id="currentCTC"
                placeholder="in LPA..."
                type="number"
                {...currentCTCField}
                className={
                  currentCTCMeta.error && currentCTCMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {currentCTCMeta.touched && currentCTCMeta.error && (
                <p className="text-sm text-red-500">{currentCTCMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="noticePeriod">Notice Period (days)</Label>
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
          <CustomFields formName="Candidate" isEditMode={isEditMode} />

          {/* Assignment Section - Mobile */}
          {user && user.role !== "candidate" && (
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
                    <SelectContent>
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
                    onChange={(date) => setFieldValue("assignment.time", date)}
                    placeholder="Select time"
                  />
                  {errors?.assignment && (
                    <p className="text-sm text-red-500">
                      {String(
                        errors.assignment[
                          "time" as keyof typeof errors.assignment
                        ] || ""
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Attachments - Mobile */}
          <div className="space-y-2">
            <Label>Additional Attachments</Label>

            <MobileFileUpload
              accept={{}}
              maxFiles={user && user.role === "candidate" ? 2 : 30}
              onFileSelect={(files) => {
                const currentFiles = attachmentsField.value || [];

                const newFiles = files
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
                  user.role === "candidate"
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
              setter={(files) => setFieldValue("attachments", files)}
              buttonText="Add Attachments"
            />
          </div>

          {/* Resume Preview - Mobile */}
          {/* {tempResumeUrl && (
            <div className="space-y-2">
              <Label>Resume Preview</Label>
              <div className="w-full h-64 rounded-lg border overflow-hidden">
                <iframe
                  src={tempResumeUrl}
                  className="w-full h-full"
                  title="Resume Preview"
                />
              </div>
            </div>
          )} */}

          {/* Bottom padding for mobile to ensure content is accessible */}
          <div className="h-24"></div>
        </div>
      </div>

      {/* Desktop Layout - Side by Side */}
      <div className="hidden lg:flex lg:flex-row lg:gap-6 lg:flex-1 lg:h-full lg:overflow-hidden">
        {/* Form Section - Desktop */}
        <div className="w-1/2 space-y-6 overflow-y-auto px-6 py-6">
          {/* Resume Upload */}
          <div className="space-y-2">
            <Label>
              Resume <span className="text-red-500">*</span>
            </Label>
            <FileUpload
              id="resume"
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
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
                  user.role === "candidate" &&
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
                setFieldValue("resume", files[0]); // Set the File object for form submission

                // Create a temporary blob URL for immediate client-side preview
                setTempResumeUrl(URL.createObjectURL(files[0]));

                // Call onFileUpload to handle the actual upload to a persistent storage (e.g., Vercel Blob)
                // The parent component should update `values.resume` with the public URL returned from the upload
                // For example: const publicUrl = await onFileUpload(files[0]);
                // if (publicUrl) { setFieldValue("resume", { url: publicUrl }); }
                if (onFileUpload) {
                  await onFileUpload(files[0]);
                }
                setTimeout(() => {
                  setTouched({
                    name: true,
                    location: true,
                    experience: true,
                    skills: true,
                    expectedCTC: true,
                    currentCTC: true,
                    noticePeriod: true,
                    resume: true,
                    email: true,
                  });
                }, 100);
              }}
              files={resumeField.value ? [resumeField.value] : []}
              setter={(files) => setFieldValue("resume", files[0])}
            />
            {resumeMeta.touched && resumeMeta.error && (
              <div className="text-sm text-destructive">{resumeMeta.error}</div>
            )}
          </div>

          {/* Personal Information Grid - Desktop */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
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
              <Label htmlFor="email">
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
              <Label htmlFor="location">
                Location <span className="text-red-500">*</span>
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
              <Label htmlFor="experience">Experience (years)</Label>
              <Input
                id="experience"
                placeholder="Enter experience in years..."
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

          {/* Skills - Desktop */}
          <div className="space-y-2">
            <Label>
              Skills (Hit Enter to Add) <span className="text-red-500">*</span>
            </Label>
            <ChipInput
              placeholder="Hit Enter to Add"
              value={skillsField.value}
              onChange={(skills) => setFieldValue("skills", skills)}
              onSuggestionClick={(suggestion) => {
                setFieldValue("skills", [...skillsField.value, suggestion]);
              }}
            />
            {skillsMeta.touched && skillsMeta.error && (
              <p className="text-sm text-red-500">{skillsMeta.error}</p>
            )}
          </div>

          {/* CTC and Notice Period Grid - Desktop */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedCTC">Expected CTC (LPA)</Label>
              <Input
                id="expectedCTC"
                placeholder="in LPA..."
                type="number"
                {...expectedCTCField}
                className={
                  expectedCTCMeta.error && expectedCTCMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {expectedCTCMeta.touched && expectedCTCMeta.error && (
                <p className="text-sm text-red-500">{expectedCTCMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentCTC">Current CTC (LPA)</Label>
              <Input
                id="currentCTC"
                placeholder="in LPA..."
                type="number"
                {...currentCTCField}
                className={
                  currentCTCMeta.error && currentCTCMeta.touched
                    ? "border-red-500"
                    : ""
                }
              />
              {currentCTCMeta.touched && currentCTCMeta.error && (
                <p className="text-sm text-red-500">{currentCTCMeta.error}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="noticePeriod">Notice Period (days)</Label>
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

          {/* Custom Fields - Desktop */}
          <CustomFields formName="Candidate" isEditMode={isEditMode} />

          {/* Assignment Section - Desktop */}
          {user && user.role !== "candidate" && (
            <div className="space-y-4 border-t pt-4">
              <Label className="text-lg font-semibold">Assignment</Label>
              <div className="grid grid-cols-2 gap-4">
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
                    <SelectContent>
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
                    onChange={(date) => setFieldValue("assignment.time", date)}
                    placeholder="Select time"
                  />
                  {errors?.assignment && (
                    <p className="text-sm text-red-500">
                      {String(
                        errors.assignment[
                          "time" as keyof typeof errors.assignment
                        ] || ""
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Attachments - Desktop */}
          <div className="space-y-2">
            <Label>Additional Attachments</Label>
            <FileUpload
              accept={{}}
              maxFiles={user && user.role === "candidate" ? 2 : 30}
              onFileSelect={(files) => {
                const currentFiles = attachmentsField.value || [];

                const newFiles = files
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
                  user.role === "candidate"
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
              setter={(files) => setFieldValue("attachments", files)}
            />
          </div>
        </div>

        {/* Resume Preview Section */}
        <div className="w-full lg:w-1/2 h-64 sm:h-80 lg:h-full">
          <div className="w-full h-full rounded-lg border overflow-hidden">
            {tempResumeUrl ? (
              <iframe
                src={tempResumeUrl}
                className="w-full h-full"
                title="Resume Preview"
              />
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                <div className="text-center p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                    No Resume Preview Available
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    Please upload resume to see a preview here!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
