import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { useSendUnassignMailMutation } from "@/lib/features/org/orgApi";
import { Candidate } from "@/types/candidate";
import { ICandidateHistory } from "@/lib/models/history";
import { User } from "@/lib/features/users/usersApi";
import { usePathname } from "next/navigation";

export const useUnassignHandlers = (
  localCandidate: Candidate | null,
  user: User | null,
  refetch: () => Promise<void>,
  setLocalCandidate: (candidate: Candidate) => void,
  // unassignNote?: string | null,
  // unassignRating?: number | null,
  onUpdate?: (candidate: Candidate) => void,
  refetchAssignment?: () => void,
  onOpenChange?: (open: boolean) => void
) => {
  const pathname = usePathname();
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [sendUnassignEmail, { isLoading: isSendingEmail }] =
    useSendUnassignMailMutation();

  const handleUnassign = () => {
    setConfirmUnassignOpen(true);
  };

  const confirmUnassign = async (
    unassignNote?: string | null,
    unassignRating?: number | null
  ) => {
    setIsUnassigning(true);
    try {
      const updatedCandidate = {
        ...localCandidate,
        assignment: null,
      };

      const result = await updateCandidate(updatedCandidate).unwrap();
      if (result) {
        onUpdate?.(result);
        setLocalCandidate(result);
        if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
          await refetch();
        } else {
          refetchAssignment?.();
        }
        // debugger;
        const previousInterviewerId =
          typeof localCandidate?.assignment?.interviewerId === "object"
            ? Object(localCandidate.assignment.interviewerId._id)
            : null;
        const newHistoryEntry: ICandidateHistory = {
          dateTime: new Date().toISOString(),
          currentInterviewer: null,
          previousInterviewer: previousInterviewerId,
          assignmentBy: user!.id,
          title: null,
          note: {
            description: unassignNote || "",
            date: "",
            rating: unassignRating || 0,
            userId: null,
          },
          attachments: [],
        };
        await updateCandidateHistory({
          candidateId: updatedCandidate._id || "",
          jobId: localCandidate?.jobId._id || localCandidate?.jobId || "",
          newEntry: newHistoryEntry,
        }).unwrap();
        sendUnassignEmail({
          name: result.name,
          candidateId: updatedCandidate._id || "",
          jobId: localCandidate?.jobId._id || localCandidate?.jobId || "",
          title: localCandidate?.jobId.title || localCandidate?.jobId || "",
          dateTime: new Date().toISOString(),
          status: localCandidate?.status,
          feedback: newHistoryEntry.note,
          // note: {
          //   description: "",
          //   date: "",
          //   rating: 0,
          //   userId: null,
          // },
        });

        if (pathname === "/dashboard/calendar") {
          onOpenChange?.(false);
        }
        toast({
          title: "Success",
          description: "Interviewer has been unassigned successfully",
        });
      }
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
      setIsUnassigning(false);
    }
  };

  return {
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    isLoading: isUnassigning,
    handleUnassign,
    confirmUnassign,
  };
};
