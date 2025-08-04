import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { FormikHelpers } from "formik";
import {
  useSendMailMutation,
  useSendUnassignMailMutation,
} from "@/lib/features/org/orgApi";
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { sentAssignmentMail } from "@/lib/utils";
import { ICandidateHistory } from "@/lib/models/history";
import {
  FormValues,
  User,
  AssignCandidateDialogProps,
} from "../schemas/AssignCandidateSchema";
import { usePathname } from "next/navigation";
import { Interviewer } from "@/lib/features/user/userApi";
import { Candidate } from "@/types/candidate";

export const useAssignCandidate = ({
  candidate,
  refetch,
  onOpenChange,
  onUpdate,
  setLocalCandidate,
  refetchAssignment,
  onSuccess,
}: AssignCandidateDialogProps) => {
  const pathname = usePathname();
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [sendEmail] = useSendMailMutation();
  const [sendUnassignEmail] = useSendUnassignMailMutation();
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>,
    user: User | null,
    interviewers: Interviewer[] | undefined
  ) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const fileNames = candidate.attachments.map((file) => file.name);
    const hasDuplicates = new Set(fileNames).size !== fileNames.length;

    if (hasDuplicates) {
      toast({
        title: "Alert",
        description:
          "A file with the same name already exists in this candidate. Please rename before submitting.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    try {
      const newRemarkObj = {
        description: values.remark.trim(),
        date: new Date().toISOString(),
        rating: values.rating ? Number(values.rating) : 0,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
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
          time: values?.time?.toISOString(),
          assignedAt: new Date().toISOString(),
        },
        attachments: [...candidate.attachments, ...values.attachments],
      };

      const previousInterviewer =
        typeof candidate.assignment?.interviewerId === "object"
          ? candidate.assignment.interviewerId.name
          : "";
      const previousInterviewerId =
        typeof candidate.assignment?.interviewerId === "object" &&
        Object.keys(candidate.assignment?.interviewerId).length > 0
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
          nextInterviewerId = foundNextInterviewer._id;
        }
      }

      const title =
        !previousInterviewer || previousInterviewer === ""
          ? `Assigned to ${nextInterviewer} : Assigned by ${user.name}`
          : `${previousInterviewer} → ${nextInterviewer} : Assigned by ${user.name}`;

      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        currentInterviewer: nextInterviewerId,
        previousInterviewer: previousInterviewerId,
        assignmentBy: user.id,
        title: title,
        note: newRemarkObj,
        attachments: values.attachments,
      };

      const { data: result, error } = await updateCandidate(
        updatedCandidate as Candidate
      );
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
      }
      onSuccess();
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

  const confirmUnassign = async (user: User | null) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      });
      return;
    }

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
      onSuccess();

      const previousInterviewerId =
        typeof candidate.assignment?.interviewerId === "object"
          ? Object(candidate.assignment.interviewerId._id)
          : null;
      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        currentInterviewer: null,
        previousInterviewer: previousInterviewerId,
        assignmentBy: user.id,
        title: "Unassigned",
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
      // sendUnassignEmail({ name: result.name });
      sendUnassignEmail({
        name: result.name,
        candidateId: updatedCandidate._id,
        jobId: candidate.jobId.title || candidate.jobId,
        title: candidate.jobId.title || candidate.jobId,
        dateTime: new Date().toISOString(),
        status: candidate?.status,
        feedback: newHistoryEntry.note,
      });
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

  return {
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    handleSubmit,
    handleUnassign,
    confirmUnassign,
  };
};
