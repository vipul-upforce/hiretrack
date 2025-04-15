"use client";

import { useEffect, useState } from "react";
import { Formik, Form, Field, FormikHelpers, FieldProps } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Candidate } from "@/types/candidate";
import { toast } from "@/hooks/use-toast";
import {
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { useFetchInterviewersQuery } from "@/lib/features/user/userApi";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import dayjs from "dayjs";
import { usePathname } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";
import { v4 as uuidv4 } from "uuid";
import { Textarea } from "@/components/ui/textarea";
import { Rating } from "@mui/material";
import Cookies from "js-cookie";
import { ICandidateHistory } from "@/lib/models/history";
import { useSendMailMutation } from "@/lib/features/org/orgApi";
import { sentAssignmentMail } from "@/lib/utils";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

interface AssignCandidateDialogProps {
  candidate: Candidate;
  refetch: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedCandidate: Candidate) => void;
  setLocalCandidate: (candidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess: () => void;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface FormValues {
  interviewerId: string;
  time: dayjs.Dayjs;
  remark: string;
  rating: number | null;
  attachments: Attachment[];
}

// Validation schema
const validationSchema = Yup.object({
  interviewerId: Yup.string().required("Interviewer is required"),
  time: Yup.date().min(new Date(), "Past date is not allowed").nullable(),
  remark: Yup.string(),
  rating: Yup.number().nullable(),
  attachments: Yup.array(),
});

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
  const pathname = usePathname();
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [sendEmail] = useSendMailMutation();
  const [updateCandidate] = useUpdateCandidateMutation();
  const { data: interviewers, refetch: refetchInterviewers } =
    useFetchInterviewersQuery();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [user, setuser] = useState<User | null>(null);

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
    if (isOpen) {
      refetchInterviewers();
    }
  }, [isOpen, refetchInterviewers]);

  // Initial form values
  const initialValues: FormValues = {
    interviewerId:
      typeof candidate.assignment?.interviewerId === "string"
        ? candidate.assignment.interviewerId
        : candidate.assignment?.interviewerId?._id || "",
    time: candidate.assignment ? dayjs(candidate.assignment.time) : dayjs(),
    remark: "",
    rating: null,
    attachments: [],
  };

  // Function to convert files to data URLs
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    const fileNames = candidate.attachments.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    if (hasDuplicates) {
      toast({
        title: "Alert",
        description:
          "A file with the same name already exists in this candidate, Please rename before submitting.",
        variant: "destructive",
      });
      return;
    }
    try {
      const newRemarkObj = {
        description: values.remark.trim(),
        date: new Date().toISOString(),
        rating: values.rating ? Number(values.rating) : 0,
        userId: {
          _id: user!.id,
          name: user!.name,
          email: user!.email,
        },
      };

      const updatedCandidate = {
        ...candidate,
        remarks:
          newRemarkObj.description || values.rating
            ? [...(candidate.remarks || []), newRemarkObj]
            : candidate.remarks,
        assignment: {
          interviewerId: values.interviewerId,
          time: values.time.toString(),
          assignedAt: dayjs().toString(),
        },
        attachments: [...candidate.attachments, ...values.attachments],
      };

      const previousInterviewer =
        typeof candidate.assignment?.interviewerId === "object"
          ? candidate.assignment.interviewerId.name
          : "";
      const previousInterviewerId =
        typeof candidate.assignment?.interviewerId === "object"
          ? Object(candidate.assignment.interviewerId._id)
          : null;

      let nextInterviewer = "No Next interviewer";
      let nextInterviewerId = null;
      if (values.interviewerId && interviewers) {
        const foundNextInterviewer = interviewers.find(
          (interviewer) => interviewer._id === values.interviewerId
        );
        if (foundNextInterviewer) {
          nextInterviewer = foundNextInterviewer.name;
          nextInterviewerId = Object(foundNextInterviewer._id);
        }
      }

      let title;
      if (!previousInterviewer || previousInterviewer === "") {
        title = `Assigned to ${nextInterviewer} : Assigned by ${user!.name}`;
      } else {
        title = `${previousInterviewer} → ${nextInterviewer} : Assigned by ${user!.name}`;
      }

      title = null;

      const newHistoryEntry: ICandidateHistory = {
        dateTime: updatedCandidate.assignment.time,
        currentInterviewer: nextInterviewerId,
        previousInterviewer: previousInterviewerId,
        assignmentBy: user!.id,
        title: title,
        note: newRemarkObj,
        attachments: values.attachments,
      };

      const { data: result, error } = await updateCandidate(updatedCandidate);
      if (!error) {
        sentAssignmentMail(result, sendEmail);
      }
      await updateCandidateHistory({
        candidateId: updatedCandidate._id,
        jobId: candidate.jobId._id || candidate.jobId,
        newEntry: newHistoryEntry,
      }).unwrap();
      if (result) {
        onUpdate(result);
        onOpenChange(false);
        setLocalCandidate(result);
      }

      if (pathname === "/dashboard") {
        refetchAssignment?.();
      }

      toast({
        title: "Success",
        description: "Candidate assigned successfully",
      });
      if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
        refetch();
        onSuccess();
      }
    } catch (error) {
      if (typeof error === "object" && error !== null && "data" in error) {
        const errorData = (error as { data?: { error?: string } }).data;

        if (
          typeof errorData === "object" &&
          errorData !== null &&
          "error" in errorData
        ) {
          toast({
            title: "Error",
            description: errorData.error || "Failed to update job",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Error",
        description: "Failed to update job due to an unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = () => {
    setConfirmUnassignOpen(true);
  };

  const confirmUnassign = async () => {
    try {
      const updatedCandidate = {
        ...candidate,
        assignment: null,
      };
      const result = await updateCandidate(updatedCandidate).unwrap();
      onUpdate(result);
      onOpenChange(false);
      setLocalCandidate(result);
      if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
        await refetch();
      } else {
        refetchAssignment?.();
      }
      const previousInterviewerId =
        typeof candidate.assignment?.interviewerId === "object"
          ? Object(candidate.assignment.interviewerId._id)
          : null;
      const newHistoryEntry: ICandidateHistory = {
        dateTime: "",
        currentInterviewer: null,
        previousInterviewer: previousInterviewerId,
        assignmentBy: user!.id,
        title: null,
        note: {
          description: "",
          date: "",
          rating: 0,
          userId: null,
        },
        attachments: [],
      };
      await updateCandidateHistory({
        candidateId: updatedCandidate._id,
        jobId: candidate.jobId._id || candidate.jobId,
        newEntry: newHistoryEntry,
      }).unwrap();
      toast({
        title: "Success",
        description: "Interviewer has been unassigned successfully",
      });
    } catch (error: unknown) {
      toast({
        title:
          "Error: " +
          (error instanceof Error ? error.message : "Unknown error"),
        description: "Failed to unassign interviewer",
        variant: "destructive",
      });
    } finally {
      setConfirmUnassignOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-start">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex justify-between align-center">
            Assign Candidate
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form className="flex-1 flex flex-col h-full overflow-y-scroll ">
              <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-6">
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
                      <div className="text-red-500 text-sm">{errors.time}</div>
                    )}
                  </div>

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
                    <FileUpload
                      accept={{}}
                      maxFiles={30}
                      onFileSelect={async (files) => {
                        const newAttachments = await Promise.all(
                          files.map(async (file) => {
                            const dataUrl = await readFileAsDataURL(file);
                            let newFileName = file.name;
                            if (
                              candidate.attachments.some(
                                (existingFile) =>
                                  existingFile.name === file.name
                              ) ||
                              values.attachments.some(
                                (existingFile) =>
                                  existingFile.name === file.name
                              )
                            ) {
                              // const timestamp = Date.now();
                              const fileExtension = file.name.split(".").pop();
                              const baseName = file.name.replace(
                                /\.[^/.]+$/,
                                ""
                              );
                              newFileName = `${baseName}_${uuidv4()}.${fileExtension}`;
                            }
                            return {
                              id: uuidv4(),
                              name: newFileName,
                              url: dataUrl,
                              type: file.type,
                              size: file.size,
                            };
                          })
                        );
                        setFieldValue("attachments", [
                          ...values.attachments,
                          ...newAttachments,
                        ]);
                      }}
                      files={(values.attachments || []).map(
                        (att) =>
                          new File([att.url], att.name, { type: att.type })
                      )}
                      setter={(uiFiles) => {
                        const fileIndexMap = new Map();
                        uiFiles.forEach((file, index) => {
                          fileIndexMap.set(file, index);
                        });

                        const updatedAttachments = uiFiles.map(
                          (file, index) => {
                            const existingAttachment =
                              values.attachments[index] ||
                              values.attachments.find(
                                (att) => att.size === file.size
                              );

                            if (existingAttachment) {
                              return {
                                ...existingAttachment,
                                name: file.name,
                                type: file.type,
                              };
                            } else {
                              return {
                                id: uuidv4(),
                                name: file.name,
                                url: "",
                                type: file.type,
                                size: file.size,
                              };
                            }
                          }
                        );
                        const duplicateFiles = updatedAttachments.filter(
                          (newFile) =>
                            candidate.attachments.some(
                              (existingFile) =>
                                existingFile.name === newFile.name
                            ) ||
                            values.attachments.some(
                              (existingFile) =>
                                existingFile.name === newFile.name
                            )
                        );

                        const uniqueRenamedAttachments =
                          updatedAttachments.filter(
                            (newFile) =>
                              !duplicateFiles.some(
                                (duplicate) => duplicate.name === newFile.name
                              )
                          );
                        const filteredSelecedFiles = values.attachments.filter(
                          (file) =>
                            !uniqueRenamedAttachments.some(
                              (newFile) => newFile.id === file.id
                            )
                        );
                        if (uniqueRenamedAttachments.length > 0) {
                          setFieldValue("attachments", [
                            ...filteredSelecedFiles,
                            ...uniqueRenamedAttachments,
                          ]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex relative bottom-0 justify-between w-full space-x-2 border-t bg-background px-6 py-4">
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>

      {/* Confirm Unassign Dialog */}
      <Dialog open={confirmUnassignOpen} onOpenChange={setConfirmUnassignOpen}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Confirm Mark As Done</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to Mark As Done this interviewer?</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmUnassignOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmUnassign}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
