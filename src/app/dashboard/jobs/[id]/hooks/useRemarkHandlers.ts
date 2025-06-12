import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  useUpdateCandidateMutation,
  useUpdateCandidateHistoryMutation,
} from "@/lib/features/candidate/candidateApi";
import { Candidate } from "@/types/candidate";
import { ICandidateHistory } from "@/lib/models/history";
import { User } from "@/lib/features/users/usersApi";
import { usePathname } from "next/navigation";

export const useRemarkHandlers = (
  localCandidate: Candidate | null,
  user: User | null,
  refetch: () => Promise<void>,
  refetchAssignment?: () => void,
  onUpdate?: (candidate: Candidate) => void,
  refetchCandidates?: () => void
) => {
  const pathname = usePathname();
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [newRemark, setNewRemark] = useState("");
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null
  );
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);

  useEffect(() => {
    if (user?.role === "interviewer") {
      setIsSubRemarkPrivate(false);
    }
  }, [user]);

  // alert(`${user?.role!} + ${isSubRemarkPrivate}`);
  const handleRemarkUpdate = async (
    id: string,
    description: string,
    isPrivate?: boolean
  ) => {
    try {
      const response = await fetch("/api/candidates/history", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          isPrivate,
          description,
          rating: remarkRatingHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update remark");
      }

      await response.json();

      if (pathname === "/dashboard" && !pathname?.startsWith("/candidate")) {
        refetchAssignment?.();
      }
      if (
        pathname !== "/dashboard" &&
        pathname !== "/dashboard/calendar" &&
        !pathname?.startsWith("/candidate")
      ) {
        await refetch();
      }

      if (onUpdate && localCandidate) {
        onUpdate(localCandidate);
      }

      toast({
        title: "Success",
        description: "Remark status updated successfully",
      });
    } catch (e) {
      console.error("Failed to update remark:", e);
      toast({
        title: "Error",
        description: "Failed to update remark. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddRemark = async () => {
    // debugger;
    if (!newRemark.trim() || !user?.id) {
      toast({
        title: "Error",
        description: "Please add remarks",
        variant: "destructive",
      });
      return;
    }

    try {
      const newRemarkObj = {
        description: String(newRemark).trim(),
        date: new Date().toISOString(),
        rating: remarkRating ? Number(remarkRating) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      const newRemarkHistoryObj = {
        isPrivate: isSubRemarkPrivate,
        description: String(newRemark).trim(),
        date: new Date().toISOString(),
        rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        remark: newRemarkHistoryObj,
        currentInterviewer: null,
        previousInterviewer: null,
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
      const updateData = {
        _id: localCandidate?._id,
        name: localCandidate?.name,
        remarks: [...(localCandidate?.remarks || []), newRemarkObj],
      };
      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());
      if (
        pathname !== "/dashboard" &&
        !pathname?.endsWith("calendar") &&
        !pathname?.startsWith("/candidate")
      ) {
        await refetch();
      }
      if (pathname === "/dashboard" && !pathname?.startsWith("/candidate")) {
        await refetchAssignment?.();
      }
      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result && pathname !== "/dashboard/calendar") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdate(result);
      }
      if (onUpdate && localCandidate) {
        await onUpdate(localCandidate);
      }

      if (pathname === "/dashboard/search") {
        // debugger;
        await refetchCandidates?.();
        await refetch();
      }
      setNewRemark("");
      setRemarkRating(null);
      setRemarkRatingHistory(null);

      toast({
        title: "Success",
        description: "Remark added successfully",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  return {
    newRemark,
    setNewRemark,
    remarkRating,
    setRemarkRating,
    remarkRatingHistory,
    setRemarkRatingHistory,
    isSubRemarkPrivate,
    setIsSubRemarkPrivate,
    handleRemarkUpdate,
    handleAddRemark,
  };
};
