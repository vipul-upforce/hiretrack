/**
 * Custom hook for handling candidate creation submission logic
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useApplicationEventMailMutation,
  useCreateCandidateMutation,
  useEvaluateCandidateMutation,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { v4 as uuidv4 } from "uuid";
import { ICandidateHistory } from "@/lib/models/history";
import { Resume } from "@/lib/redux/types";
import { CustomFieldValues } from "@/Custom_Fields/hooks/useCustomForm";

interface CandidateFormValues {
  name: string;
  location: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  expectedCTC: number;
  currentCTC: number;
  noticePeriod: number;
  resume: File | null;
  remarks: string;
  attachments: File[];
  assignee: string;
  time: Date | undefined;
  customFields: CustomFieldValues;
  email: string;
}

interface UseCreateCandidateSubmissionProps {
  jobId: string;
  parsedResumeData: Resume | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  onSuccess: () => void;
}

// Helper function to convert file to base64
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper function to evaluate candidate
async function evaluateCandidate(
  candidateId: string,
  evaluateCandidateMutation: ReturnType<typeof useEvaluateCandidateMutation>[0]
) {
  try {
    const result = await evaluateCandidateMutation({ candidateId }).unwrap();
    return result;
  } catch {
    return null;
  }
}

// Helper function to send applied event mail
async function sendAppliedEventMail(
  candidateId: string,
  applicationEventMailMutation: ReturnType<
    typeof useApplicationEventMailMutation
  >[0]
) {
  try {
    const resp = await applicationEventMailMutation({ candidateId }).unwrap();
    return resp;
  } catch {
    return null;
  }
}

export function useCreateCandidateSubmission({
  jobId,
  parsedResumeData,
  user,
  onSuccess,
}: UseCreateCandidateSubmissionProps) {
  const { toast } = useToast();
  const [createCandidate, { isLoading: isAdding }] =
    useCreateCandidateMutation();
  const [evaluateCandidateMutation, { isLoading: isEvaluating }] =
    useEvaluateCandidateMutation();
  const [applicationEventMailMutation, { isLoading: isSendingEmail }] =
    useApplicationEventMailMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [updateAppliedApplication, { isLoading }] =
    useUpdateAppliedApplicationMutation();
  const [isCreating, setIsCreating] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const submitCandidate = async (values: CandidateFormValues) => {
    console.log("submitCandidate", isFormSubmitting, isCreating);
    // Prevent duplicate submissions
    if (isFormSubmitting || isCreating) {
      return;
    }

    const fileNames = values.attachments.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

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
      setIsFormSubmitting(true);
      const hasOnlySpaces = Object.entries(values).some((value) => {
        if (typeof value[1] === "string") {
          return value[1].length > 0 && value[1].trim() === "";
        }
        return false;
      });

      if (hasOnlySpaces) {
        toast({
          title: "Validation Error",
          description: "Fields cannot contain only spaces",
          variant: "destructive",
        });
        setIsFormSubmitting(false);
        return;
      }

      const resumeBase64 = values.resume
        ? await convertFileToBase64(values.resume)
        : null;

      const attachmentsBase64 = await Promise.all(
        values.attachments.map((file) => convertFileToBase64(file))
      );

      const candidateData = {
        ...values,
        jobId: {
          _id: jobId,
          title: "",
          description: "",
        },
        currentCTC: Number(parseFloat(String(values.currentCTC)).toFixed(2)),
        expectedCTC: Number(parseFloat(String(values.expectedCTC)).toFixed(2)),
        experience: Number(parseFloat(String(values.experience)).toFixed(2)),
        relevantExperience: Number(
          parseFloat(String(values.relevantExperience)).toFixed(2)
        ),
        noticePeriod: Number(
          parseFloat(String(values.noticePeriod)).toFixed(0)
        ),
        email: values.email || parsedResumeData?.profile?.email,
        ...(values.assignee && values.time
          ? {
              assignee: values.assignee === "-1" ? "" : values.assignee,
              time: values.time,
            }
          : {}),
        resume: resumeBase64
          ? {
              id: uuidv4(),
              name: values.resume?.name || "",
              url: resumeBase64,
              type: "pdf",
              size: values.resume?.size || 0,
            }
          : undefined,
        attachments: attachmentsBase64.map((base64, index) => ({
          id: uuidv4(),
          name: values.attachments[index].name,
          url: base64,
          type: values.attachments[index].type,
          size: values.attachments[index].size,
        })),
        remarks: [],
      };

      setIsCreating(true);

      const createdCandidate = await createCandidate(candidateData).unwrap();
      const candidateId = createdCandidate._id;

      // Always attempt evaluation if resume is PDF
      if (values.resume && values.resume.type === "application/pdf") {
        try {
          evaluateCandidate(candidateId, evaluateCandidateMutation);
        } catch (evalError) {
          console.warn(
            "AI evaluation failed or was skipped by server:",
            evalError
          );
        }
      }

      // Handle additional updates (if applicable)
      if (user?.role === "candidate" || user?.role === "") {
        try {
          await updateAppliedApplication({ id: jobId });
        } catch (error: unknown) {
          toast({
            title: "Failed",
            description: `${
              error instanceof Error ? error.message : "Unknown Error Occurred"
            }`,
          });
        }
      }

      if (createdCandidate?.assignment?.interviewerId) {
        const newHistoryEntry: ICandidateHistory = {
          dateTime: new Date().toISOString() || "",
          title:
            typeof createdCandidate?.assignment?.interviewerId === "object" &&
            createdCandidate?.assignment?.interviewerId?.name
              ? `Assigned to ${createdCandidate.assignment.interviewerId.name} : Assigned by ${user!.name}`
              : "",
          currentInterviewer:
            typeof createdCandidate?.assignment?.interviewerId === "object" &&
            createdCandidate?.assignment?.interviewerId
              ? Object(createdCandidate.assignment.interviewerId._id)
              : null,
          previousInterviewer: null,
          assignmentBy: user && user.id,
          note: {
            description: "",
            date: "",
            rating: 0,
            userId: null,
          },
          attachments:
            createdCandidate.attachments?.map((attachment) => ({
              id: attachment.id,
              name: attachment.name,
              url: attachment.url,
              type: attachment.type,
              size: attachment.size,
            })) || [],
        };
        await updateCandidateHistory({
          candidateId: createdCandidate._id,
          jobId: candidateData.jobId,
          newEntry: newHistoryEntry,
        }).unwrap();
      }

      onSuccess();
      if (user?.role === "candidate" || user?.role === "") {
        sendAppliedEventMail(candidateId, applicationEventMailMutation);
      }
    } catch (error) {
      console.error("Create candidate error:", error);

      let errorMessage =
        "Failed to create candidate due to an unexpected error.";

      if (typeof error === "object" && error !== null) {
        if ("data" in error) {
          const errorData = (error as { data?: any }).data;
          if (errorData?.error) {
            errorMessage = errorData.error;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          }
        } else if (
          "message" in error &&
          typeof (error as any).message === "string"
        ) {
          errorMessage = (error as any).message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsFormSubmitting(false);
      setIsCreating(false);
    }
  };

  return {
    submitCandidate,
    isCreating,
    isFormSubmitting,
    isLoading: isAdding || isEvaluating || isSendingEmail || isLoading,
  };
}



