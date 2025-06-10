"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Formik, Form } from "formik";
import { candidateSchema } from "../../schemas/candidate-schema";
import { CandidateForm } from "../Candidate/candidate-form";
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { Candidate } from "@/types/candidate";
import { v4 as uuidv4 } from "uuid";
import { useParams, usePathname } from "next/navigation";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { ICandidateHistory } from "@/lib/models/history";
import { useEffect, useState } from "react";
import { Resume } from "@/lib/redux/types";
import { parseResumeFromPdf } from "@/lib/parse-resume-from-pdf";
import FormUpdater from "../Utils/FormUpdater";
import Cookies from "js-cookie";
import { useSendMailMutation } from "@/lib/features/org/orgApi";
import { sentAssignmentMail } from "@/lib/utils";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useApplyHandler } from "@/app/apply-jobs/useApplyHandler";

interface EditCandidateDialogProps {
  candidate: Candidate;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedCandidate: Candidate) => void;
  refetchAssignment?: () => void;
  onSuccess: () => void;
  reopenDetailsDialog?: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const handleFileParse = async (
  file: File | null,
  setParsedResume: (data: Resume | null) => void
) => {
  if (file && file.type === "application/pdf") {
    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;

      if (result && typeof result === "string") {
        try {
          const fileUrl = result;

          const parsedData = await parseResumeFromPdf(fileUrl);
          setParsedResume(parsedData);
        } catch {
          setParsedResume(null);
        }
      }
    };

    reader.readAsDataURL(file);
  }
};

const isFetchBaseQueryError = (
  error: unknown
): error is FetchBaseQueryError & { data: { error: string } } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "error" in error.data &&
    typeof error.data.error === "string"
  );
};

export function EditCandidateDialog({
  candidate,
  isOpen,
  onOpenChange,
  onUpdate,
  refetchAssignment,
  onSuccess,
  reopenDetailsDialog,
}: EditCandidateDialogProps) {
  const { toast } = useToast();
  const id = useParams()?.id as string;
  const [updateCandidate] = useUpdateCandidateMutation();
  const [sendEmail] = useSendMailMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();

  const formName = "Candidate";
  const { getDefaultValues, validationSchema } = useCustomForm(formName);
  const pathname = usePathname();
  const [parsedResumeData, setParsedResume] = useState<Resume | null>(null);
  const [user, setuser] = useState<User | null>(null);
  const { formikRef, handleApply } = useApplyHandler<any>();

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

  const handleSubmit = async (values: Candidate) => {
    const fileNames = values.attachments.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    console.log("------- ", user);
    if (hasDuplicates) {
      toast({
        title: "Alert",
        description:
          "Duplicate file names found! Please rename before submitting.",
        variant: "destructive",
      });
      return;
    }
    try {
      const resumeBase64 =
        values.resume instanceof File
          ? await convertFileToBase64(values.resume)
          : values.resume?.url;

      const attachmentsBase64 = await Promise.all(
        values.attachments.map(
          async (
            file:
              | File
              | {
                  url: string;
                  id: string;
                  name: string;
                  type: string;
                  size: number;
                }
          ) => {
            if (file instanceof File) {
              const base64 = await convertFileToBase64(file);
              return {
                id: uuidv4(),
                name: file.name,
                url: base64,
                type: file.type,
                size: file.size,
              };
            }
            return file;
          }
        )
      );

      const latestModifiedAttachments = attachmentsBase64.filter(
        (newAttachment) => {
          const originalAttachment = candidate.attachments.find(
            (oldAttachment) => oldAttachment.id === newAttachment.id
          );

          if (!originalAttachment) {
            return true;
          }

          return (
            originalAttachment.name !== newAttachment.name ||
            originalAttachment.size !== newAttachment.size ||
            originalAttachment.url !== newAttachment.url
          );
        }
      );

      const updatedCandidate: Partial<Candidate> = {
        ...values,
        resume: resumeBase64
          ? {
              id: values?.resume?.id || uuidv4(),
              name:
                values.resume instanceof File
                  ? values.resume.name
                  : values?.resume?.name || "",
              url: resumeBase64,
              type: "pdf",
              size:
                values.resume instanceof File
                  ? values.resume.size
                  : values?.resume?.size || 0,
            }
          : undefined,
        email: values.email, // Added email field
        currentCTC: Number(parseFloat(String(values.currentCTC)).toFixed(2)),
        expectedCTC: Number(parseFloat(String(values.expectedCTC)).toFixed(2)),
        experience: Number(parseFloat(String(values.experience)).toFixed(2)),
        noticePeriod: Number(
          parseFloat(String(values.noticePeriod)).toFixed(0)
        ),
        attachments: attachmentsBase64,
      };

      if (values.assignment) {
        if (values.assignment.interviewerId === "-1") {
          delete updatedCandidate.assignment;
        } else if (
          typeof values.assignment.interviewerId === "string" ||
          typeof values.assignment.interviewerId === "object"
        ) {
          updatedCandidate.assignment = {
            assignment: values.assignment.assignment,
            interviewerId:
              typeof values.assignment.interviewerId === "string"
                ? values.assignment.interviewerId
                : values.assignment.interviewerId._id.replace(/"/g, ""),
            time: values.assignment.time,
            assignedAt: values.assignment.assignedAt,
          };
        }
      }

      const { data: result, error } = await updateCandidate(updatedCandidate);
      if (error) {
        toast({
          title: "Error",
          description: isFetchBaseQueryError(error)
            ? error.data.error
            : "Failed to update job",
          variant: "destructive",
        });
        return;
      }
      sentAssignmentMail(result, sendEmail);
      const previousInterviewer =
        typeof candidate.assignment?.interviewerId === "object"
          ? candidate.assignment.interviewerId.name
          : "";
      const previousInterviewerId =
        typeof candidate.assignment?.interviewerId === "object"
          ? Object(candidate.assignment.interviewerId._id)
          : null;

      const nextInterviewer =
        result && typeof result.assignment?.interviewerId === "object"
          ? result.assignment.interviewerId.name
          : "";
      const nextInterviewerId =
        result && typeof result.assignment?.interviewerId === "object"
          ? Object(result.assignment.interviewerId._id)
          : null;

      let title;
      if (!previousInterviewer || previousInterviewer === "") {
        title = `Assigned to ${nextInterviewer} : Assigned by ${
          user ? user.name : "No one"
        }`;
      } else {
        title = `${previousInterviewer} → ${nextInterviewer} : Assigned by ${
          user ? user.name : "No one"
        }`;
      }

      title = null;

      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString() || "",
        title: title,
        currentInterviewer: nextInterviewerId,
        previousInterviewer: previousInterviewerId,
        assignmentBy: user ? user.id : "",
        note: {
          description: "",
          date: "",
          rating: 0,
          userId: null,
        },
        attachments: latestModifiedAttachments || [],
      };

      if (nextInterviewer && nextInterviewer !== "") {
        await updateCandidateHistory({
          candidateId: updatedCandidate._id || "",
          jobId: updatedCandidate?.jobId || "",
          newEntry: newHistoryEntry,
        }).unwrap();
      }

      if (pathname === "/dashboard") {
        refetchAssignment?.();
      }
      if (result) {
        onUpdate(result);
      }
      if (id) {
        onSuccess();
      }
      onOpenChange(false);
      if (reopenDetailsDialog) {
        reopenDetailsDialog();
      }
      toast({
        title: "Success",
        description: "Candidate updated successfully",
      });
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
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };
  let interviewerId = "";
  if (candidate?.assignment?.interviewerId) {
    if (typeof candidate.assignment.interviewerId === "string") {
      interviewerId =
        candidate.assignment.interviewerId === "-1"
          ? ""
          : candidate.assignment.interviewerId;
    } else {
      interviewerId = candidate.assignment.interviewerId._id.replace(/"/g, "");
    }
  }

  const initialValues = {
    ...candidate,
    resume: candidate.resume,
    attachments: candidate.attachments,
    email: candidate.email, // Added email to initial values
    assignment: candidate.assignment
      ? {
          assignment: candidate.assignment.assignment,
          interviewerId,
          time: candidate.assignment.time,
          assignedAt: candidate.assignment.assignedAt,
        }
      : null,
    customFields: getDefaultValues(candidate.customFields || {}),
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
    >
      <DialogContent
        className={`sm:max-w-[80vw] ${
          candidate.resume ? "xl:max-w-[65vw]" : "xl:max-w-[50vw]"
        } h-[90vh] p-0 flex flex-col justify-between overflow-hidden`}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit Candidate</DialogTitle>
        </DialogHeader>
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={candidateSchema(validationSchema)}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, setFieldValue, dirty }) => (
            <Form className="flex flex-col h-[calc(90vh-80px)] overflow-hidden">
              <FormUpdater parsedResumeData={parsedResumeData} />
              <CandidateForm
                onFileUpload={async (file: File) => {
                  setFieldValue("resume", file);
                  await handleFileParse(file, setParsedResume);
                }}
                isEditMode={true}
              />
              <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    // if (reopenDetailsDialog) {
                    //   reopenDetailsDialog();
                    // }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  type={!errors ? "submit" : "button"}
                  // disabled={
                  //   !dirty || isSubmitting || Object.keys(errors).length > 0
                  // }
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
