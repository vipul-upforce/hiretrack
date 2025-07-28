"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChipInput } from "@/components/ui/chip-input";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileIcon } from "lucide-react";
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
import { useEffect, useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import type { User } from "@/lib/features/org/orgApi";
import dayjs from "dayjs";
import { MobileFileUpload } from "@/components/ui/file-upload-mobile";
import { useSanitizeFiles } from "@/hooks/useSanitizeFiles";

interface CandidateFormProps {
  onFileUpload?: (file: File) => Promise<string | void>; // Prop to handle file upload to a persistent storage
  isEditMode?: boolean;
}

export function CandidateForm({
  onFileUpload,
  isEditMode = false,
}: CandidateFormProps) {
  const {
    setFieldValue,
    values,
    errors,
    setTouched,
    submitCount,
    // touched,
    // setFieldTouched,
    // dirty,
  } = useFormikContext<CandidateFormValues>();
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
  const [timeTouched, setTimeTouched] = useState(false);
  // const [assignment] = useField("assignment");
  const [tempResumeUrl, setTempResumeUrl] = useState<string | null>(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null); // State to track only blob URLs for cleanup
  const [emailField, emailMeta] = useField("email");
  const [contactField, contactMeta] = useField("contact");
  const [user, setuser] = useState<User | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const { sanitizeFiles } = useSanitizeFiles();

  useEffect(() => {
    if (submitCount > 0) {
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
  }, [submitCount, errors]);

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
    // if (values.resume && !(values.resume as { url?: string }).url) {
    //   return;
    // }
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
        // console.log(newBlobUrl, "newBlobUrl");
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

  // console.log(tempResumeUrl, "tempResumeUrl");
  return (
    <div className="w-full h-full flex flex-col" ref={formRef}>
      {/* Mobile Layout - Stacked */}
      <div className="flex flex-col h-full lg:hidden">
        {/* Form Section - Mobile */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Resume Upload */}
          <div className="space-y-3">
            <Label>
              Resume <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 text-blue-700 dark:text-blue-300"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf';
                    input.onchange = async (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const file = files[0];
                        const sanitizedFiles = sanitizeFiles([file]);
                        
                        if (!user && file.size > 3 * 1024 * 1024) {
                          toast({
                            title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
                            variant: "destructive",
                          });
                          return;
                        }
                        if (
                          user &&
                          user.role === "candidate" &&
                          file.size > 3 * 1024 * 1024
                        ) {
                          toast({
                            title: "File size exceeds 3MB. Please upload a smaller file.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (
                          user &&
                          ["hr", "admin", "interviewer"].includes(user.role) &&
                          file.size > 5 * 1024 * 1024
                        ) {
                          toast({
                            title: "File size exceeds 5MB. Please upload a smaller file.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setFieldValue("resume", sanitizedFiles[0]);
                        setTempResumeUrl(URL.createObjectURL(sanitizedFiles[0]));
                        
                        if (onFileUpload) {
                          await onFileUpload(sanitizedFiles[0]);
                        }
                        setTimeout(() => {
                          setTouched({
                            name: true,
                            email: true,
                            contact: true,
                            location: true,
                            experience: true,
                            skills: true,
                            expectedCTC: true,
                            currentCTC: true,
                            noticePeriod: true,
                            resume: true as any,
                          });
                        }, 100);
                      }
                    };
                    input.click();
                  }}
                >
                  <Paperclip className="w-4 h-4" />
                  {resumeField.value ? 'Change Resume' : 'Select Resume'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  PDF files only, max {user?.role === "candidate" ? "3MB" : "5MB"}
                </span>
              </div>
              
              {resumeField.value && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {resumeField.value.name || 'Resume uploaded'}
                    </span>
                    {resumeField.value.size && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ({(resumeField.value.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => {
                      setFieldValue("resume", null);
                      setTempResumeUrl(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

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
              <Label htmlFor="contact">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact"
                type="tel"
                placeholder="Enter contact number"
                {...contactField}
                className={
                  contactMeta.error && contactMeta.touched ? "border-red-500" : ""
                }
              />
              {contactMeta.touched && contactMeta.error && (
                <p className="text-sm text-red-500">{contactMeta.error}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
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
              <Label htmlFor="experience">
                Relevant Exp in Years <span className="text-red-500">*</span>
              </Label>
              <Input
                id="experience"
                placeholder="Enter relevant experience in years"
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
              <Label htmlFor="expectedCTC">
                Expected CTC (LPA) <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="currentCTC">
                Current CTC (LPA) <span className="text-red-500">*</span>
              </Label>
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
              <Label htmlFor="noticePeriod">
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
                    onChange={(date) => {
                      setFieldValue("assignment.time", date);
                      setTimeTouched(true);
                    }}
                    placeholder="Select time"
                  />
                  {/* {errors?.assignment && touched?.assignment && (
                    <p className="text-sm text-red-500">
                      {String(
                        errors.assignment[
                          "time" as keyof typeof errors.assignment
                        ] || ""
                      )}
                    </p>
                  )} */}
                  {timeTouched &&
                    values.assignment?.time &&
                    new Date(values.assignment?.time) < new Date() && (
                      <p className="text-sm text-orange-500">
                        Assignment date should not be in past
                      </p>
                    )}
                  {/* {timeTouched &&
                    values.assignment?.time &&
                    errors.push({
                      "assignment.time":
                        "Assignment date should not be in past",
                    })} */}
                </div>
              </div>
            </div>
          )}

          {/* Additional Attachments - Mobile */}
          <div className="space-y-3">
            <Label>Additional Attachments</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-purple-700 dark:text-purple-300"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const currentFiles = attachmentsField.value || [];
                        const sanitizedFiles = sanitizeFiles(Array.from(files));
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
                              file.size > 5 * 1024 * 1024
                            ) {
                              toast({
                                title: `File "${file.name}" exceeds 5MB. Please upload a smaller file.`,
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
                        if (updatedFileSelection.length > 2) {
                          toast({
                            title: "Maximum 2 files are allowed",
                            variant: "destructive",
                          });
                          return;
                        }
                        setFieldValue("attachments", updatedFileSelection);
                      }
                    };
                    input.click();
                  }}
                >
                  <Paperclip className="w-4 h-4" />
                  Add Attachments
                </Button>
                <span className="text-sm text-muted-foreground">
                  Max 2 files, {user?.role === "candidate" ? "3MB each" : "5MB each"}
                </span>
              </div>
              
              {attachmentsField.value && attachmentsField.value.length > 0 && (
                <div className="space-y-2">
                  {attachmentsField.value.map((file: File, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {file.name}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => {
                          const updatedFiles = attachmentsField.value.filter((_: File, i: number) => i !== index);
                          setFieldValue("attachments", updatedFiles);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
        <div className="w-1/2 space-y-4 overflow-y-auto px-3 py-3 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
          {/* Resume Upload */}
          <div className="space-y-3" data-form-field="resume">
            <Label>
              Resume <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 text-blue-700 dark:text-blue-300"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf';
                    input.onchange = async (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const file = files[0];
                        const sanitizedFiles = sanitizeFiles([file]);
                        
                        if (!user && file.size > 3 * 1024 * 1024) {
                          toast({
                            title: `File "${file.name}" exceeds 3MB. Please upload a smaller file.`,
                            variant: "destructive",
                          });
                          return;
                        }
                        if (
                          user &&
                          user.role === "candidate" &&
                          file.size > 3 * 1024 * 1024
                        ) {
                          toast({
                            title: "File size exceeds 3MB. Please upload a smaller file.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (
                          user &&
                          ["hr", "admin", "interviewer"].includes(user.role) &&
                          file.size > 5 * 1024 * 1024
                        ) {
                          toast({
                            title: "File size exceeds 5MB. Please upload a smaller file.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        setFieldValue("resume", sanitizedFiles[0]);
                        setTempResumeUrl(URL.createObjectURL(sanitizedFiles[0]));
                        
                        if (onFileUpload) {
                          await onFileUpload(sanitizedFiles[0]);
                        }
                        setTimeout(() => {
                          setTouched({
                            name: true,
                            email: true,
                            contact: true,
                            location: true,
                            experience: true,
                            skills: true,
                            expectedCTC: true,
                            currentCTC: true,
                            noticePeriod: true,
                            resume: true as any,
                          });
                        }, 100);
                      }
                    };
                    input.click();
                  }}
                >
                  <Paperclip className="w-4 h-4" />
                  {resumeField.value ? 'Change Resume' : 'Select Resume'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  PDF files only, max {user?.role === "candidate" ? "3MB" : "5MB"}
                </span>
              </div>
              
              {resumeField.value && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {resumeField.value.name || 'Resume uploaded'}
                    </span>
                    {resumeField.value.size && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ({(resumeField.value.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => {
                      setFieldValue("resume", null);
                      setTempResumeUrl(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
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
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <Label htmlFor="contact" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <Label htmlFor="location" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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

              <div className="space-y-2 col-span-2" data-form-field="experience">
                <Label htmlFor="experience" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Relevant Exp in Years <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="experience"
                  placeholder="Enter relevant experience in years"
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
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Skills (Hit Enter to Add) <span className="text-red-500">*</span>
              </Label>
              <ChipInput
                placeholder="Hit Enter to Add Skills"
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
                <Label htmlFor="expectedCTC" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Expected CTC (LPA) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expectedCTC"
                  placeholder="Enter expected CTC in LPA"
                  type="number"
                  {...expectedCTCField}
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
              </div>

              <div className="space-y-2" data-form-field="currentCTC">
                <Label htmlFor="currentCTC" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current CTC (LPA) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="currentCTC"
                  placeholder="Enter current CTC in LPA"
                  type="number"
                  {...currentCTCField}
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
              </div>

              <div className="space-y-2 col-span-2" data-form-field="noticePeriod">
                <Label htmlFor="noticePeriod" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <CustomFields formName="Candidate" isEditMode={isEditMode} />

          {/* Assignment Section - Desktop */}
          {user && user.role !== "candidate" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Interview Assignment
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</Label>
                  <Select
                    value={currentInterviewerId}
                    onValueChange={(value) =>
                      setFieldValue("assignment.interviewerId", value)
                    }
                  >
                    <SelectTrigger className="h-9">
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
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Interview Time</Label>
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
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-purple-700 dark:text-purple-300"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files && files.length > 0) {
                        const currentFiles = attachmentsField.value || [];
                        const sanitizedFiles = sanitizeFiles(Array.from(files));
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
                              file.size > 5 * 1024 * 1024
                            ) {
                              toast({
                                title: `File "${file.name}" exceeds 5MB. Please upload a smaller file.`,
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
                        if (updatedFileSelection.length > 2) {
                          toast({
                            title: "Maximum 2 files are allowed",
                            variant: "destructive",
                          });
                          return;
                        }
                        setFieldValue("attachments", updatedFileSelection);
                      }
                    };
                    input.click();
                  }}
                >
                  <Paperclip className="w-4 h-4" />
                  Add Documents
                </Button>
                <span className="text-sm text-muted-foreground">
                  Max 2 files, {user?.role === "candidate" ? "3MB each" : "5MB each"}
                </span>
              </div>
              
              {attachmentsField.value && attachmentsField.value.length > 0 && (
                <div className="space-y-2">
                  {attachmentsField.value.map((file: File, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => {
                          const updatedFiles = attachmentsField.value.filter((_: File, i: number) => i !== index);
                          setFieldValue("attachments", updatedFiles);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-center p-4 sm:p-6">
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Upload resume to see preview
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
