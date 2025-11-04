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
import dayjs, { Dayjs } from "dayjs";
import { followUpSepretorPatternRegex } from "@/lib/constants";

export const useRemarkHandlers = (
  localCandidate: Candidate | null,
  user: User | null,
  refetch: () => void,
  refetchAssignment?: () => void,
  onUpdate?: (candidate: Candidate) => void,
  refetchCandidates?: () => void
) => {
  const pathname = usePathname();
  const [updateCandidate] = useUpdateCandidateMutation();
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [newRemark, setNewRemark] = useState("");

  const [newFollowUp, setNewFollowUp] = useState(
    localCandidate?.followUp?.note && localCandidate?.followUp?.note.length > 1
      ? localCandidate?.followUp?.note
      : ""
  );
  const [newFollowUpDate, setNewFollowUpDate] = useState<Dayjs | null>(
    localCandidate?.followUp?.date &&
      (localCandidate?.followUp?.date as string).length > 1
      ? dayjs(localCandidate?.followUp?.date)
      : null
  );
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null
  );
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
  const [isRemarkSubmitting, setIsRemarkSubmitting] = useState(false);
  const [isFollowUpSubmitting, setIsFollowUpSubmitting] = useState(false);
  const [MADFollowup, setMADFollowup] = useState<String | null>(null);
  useEffect(() => {
    if (user?.role === "interviewer") {
      setIsSubRemarkPrivate(false);
    }
  }, [user]);

  // Update follow-up state when candidate data changes
  useEffect(() => {
    if (
      localCandidate?.followUp?.note &&
      localCandidate?.followUp?.note.length > 1
    ) {
      setNewFollowUp(localCandidate.followUp.note);
    } else {
      handleAddFollowUp;
      setNewFollowUp("");
    }

    if (
      localCandidate?.followUp?.date &&
      (localCandidate?.followUp?.date as string).length > 1
    ) {
      setNewFollowUpDate(dayjs(localCandidate.followUp.date));
    } else {
      setNewFollowUpDate(null);
    }
  }, [localCandidate?.followUp?.note, localCandidate?.followUp?.date]);

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
    // console.log(user, "remark-user");

    setIsRemarkSubmitting(true);
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
        jobId: localCandidate?.jobId,
        remarks: [...(localCandidate?.remarks || []), newRemarkObj],
      };

      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());

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
    } finally {
      setIsRemarkSubmitting(false);
    }
  };
  const handleRemoveFollowUp = async () => {
    setIsFollowUpSubmitting(true);
    try {
      const newFollowUpObj = {
        note: null,
        // date: newFollowUpDate?.toISOString() || "",
        date: null,
        // rating: remarkRating ? Number(remarkRating) : undefined,
        userId: {
          _id: user?.id,
          name: user?.name,
          email: user?.email,
        },
      };
      // const newFollowUpHistoryObj = {
      //   // isPrivate: isSubRemarkPrivate,
      //   note: String(newFollowUp).trim(),
      //   date: new Date().toISOString(),
      //   // rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
      //   userId: {
      //     _id: user.id,
      //     name: user.name,
      //     email: user.email,
      //   },
      // };
      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user!.id,
        title: `Followup Removed`,
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
        followUp: newFollowUpObj,
      };

      // if (
      //   pathname !== "/dashboard" &&
      //   !pathname?.endsWith("calendar") &&
      //   !pathname?.startsWith("/candidate")
      // ) {
      //   await refetch();
      // }
      // if (pathname === "/dashboard" && !pathname?.startsWith("/candidate")) {
      //   await refetchAssignment?.();
      // }
      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result && pathname !== "/dashboard/calendar") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdate(result);
      }
      if (onUpdate && localCandidate) {
        await onUpdate(localCandidate);
      }
      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());
      if (pathname === "/dashboard/search") {
        // debugger;
        await refetchCandidates?.();
        await refetch();
      }
      if (
        pathname !== "/dashboard" &&
        !pathname?.endsWith("calendar") &&
        !pathname?.startsWith("/candidate")
      ) {
        await refetch();
      }
      if (pathname === "/dashboard" && !pathname?.startsWith("/candidate")) {
        await refetchAssignment?.();
        await refetch();
      }
      setNewFollowUp("");
      setNewFollowUpDate(null);
      // setRemarkRatingHistory(null);

      toast({
        title: "Success",
        description: "Followup removed successfully",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsFollowUpSubmitting(false);
    }
  };
  const handleAddFollowUp = async () => {
    if (!newFollowUp.trim() && !newFollowUpDate?.toISOString()) {
      toast({
        title: "Error",
        description: "Please provide either a follow-up note or a date.",
        variant: "destructive",
      });
      return;
    }
    // debugger;
    if (!user?.id) {
      console.log("newFollowUp", newFollowUp);
      console.log("user", user);

      toast({
        title: "Error",
        description: "Please add the follow-up note.",
        variant: "destructive",
      });
      return;
    }
    setIsFollowUpSubmitting(true);
    try {
      const followUpSeparator = "|||||\n"; // Matches regex separator

      const combinedNote = MADFollowup
        ? `${newFollowUp.trim()}${followUpSeparator}${MADFollowup}`
        : newFollowUp.trim();

      const newFollowUpObj = {
        // note: String(newFollowUp).trim(),
        note: combinedNote,
        date: newFollowUpDate?.toISOString() || "",
        // rating: remarkRating ? Number(remarkRating) : undefined,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email,
        },
      };
      setMADFollowup(null);
      // const newFollowUpHistoryObj = {
      //   // isPrivate: isSubRemarkPrivate,
      //   note: String(newFollowUp).trim(),
      //   date: new Date().toISOString(),
      //   // rating: remarkRatingHistory ? Number(remarkRatingHistory) : undefined,
      //   userId: {
      //     _id: user.id,
      //     name: user.name,
      //     email: user.email,
      //   },
      // };
      const newHistoryEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: user!.id,
        title: `Followup Created`,
        note: {
          description: newFollowUp,
          date: newFollowUpDate?.toISOString() || "",
          rating: 0,
          userId: null,
        },
        attachments: [],
      };
      const updateData = {
        _id: localCandidate?._id,
        name: localCandidate?.name,
        followUp: newFollowUpObj,
      };

      // if (
      //   pathname !== "/dashboard" &&
      //   !pathname?.endsWith("calendar") &&
      //   !pathname?.startsWith("/candidate")
      // ) {
      //   await refetch();
      // }
      // if (pathname === "/dashboard" && !pathname?.startsWith("/candidate")) {
      //   await refetchAssignment?.();
      // }
      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result && pathname !== "/dashboard/calendar") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        onUpdate(result);
      }
      if (onUpdate && localCandidate) {
        await onUpdate(localCandidate);
      }
      localCandidate &&
        (await updateCandidateHistory({
          candidateId: localCandidate?._id,
          jobId: localCandidate?.jobId,
          newEntry: newHistoryEntry,
        }).unwrap());
      if (pathname === "/dashboard/search") {
        // debugger;
        await refetchCandidates?.();
        await refetch();
      }
      if (
        pathname !== "/dashboard" &&
        !pathname?.endsWith("calendar") &&
        !pathname?.startsWith("/candidate")
      ) {
        await refetch();
      }
      if (pathname === "/dashboard" && !pathname?.startsWith("/candidate")) {
        await refetchAssignment?.();
        await refetch();
      }
      setNewFollowUp("");
      setNewFollowUpDate(null);
      // setRemarkRatingHistory(null);

      toast({
        title: "Success",
        description: "Followup created successfully",
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsFollowUpSubmitting(false);
    }
  };

  // const handleFollowUp = async()=>{
  //   try{

  //     const updatedCandidate = {
  //       ...localCandidate,
  //       followUp: null,
  //     };

  //     const result = await updateCandidate(updatedCandidate).unwrap();

  //   }catch(error){
  //     toast({
  //       title:
  //         "Error: " +
  //         (error instanceof Error ? error.message : "Unknown error"),
  //       description: "Failed to unassign interviewer",
  //       variant: "destructive",
  //     });
  //   }
  // }

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
    isRemarkSubmitting,
    handleAddRemark,
    handleAddFollowUp,
    setNewFollowUp,
    setNewFollowUpDate,
    newFollowUp,
    newFollowUpDate,
    MADFollowup,
    setMADFollowup,
    handleRemoveFollowUp,
    isFollowUpSubmitting,
  };
};
