"use client";

import { DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Candidate } from "@/types/candidate";
import { EditCandidateDialog } from "./edit-candidate-dialog";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  useEvaluateCandidateMutation,
  useLazyFetchCandidatesQuery,
} from "@/lib/features/candidate/candidateApi";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { AssignCandidateDialog } from "./assign-candidate-dialog";
import { usePathname } from "next/navigation";
import { ICandidateHistory } from "@/lib/models/history";
import { AssignJobDialog } from "./assign-job-dialog";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { User } from "@/lib/features/users/usersApi";
import { evaluateCandidate } from "@/app/apply-jobs/ApplyAsGuest";
import { CandidateDetailsDialogProps } from "../../schemas/candidateDetailsDialogProps";
import { IEditRemark } from "../../schemas/EditRemarkDialog";
import EditRemarkDialog from "./EditRemarkDialog";
import ConfirmationDialog from "./ConfirmationDialog";
import handleCandidateInfoCopy from "../../hooks/handleCandidateInfoCopy";
import DetailsDialogHeader from "../Candidate/candidate-details-header";
import RemarkInputSection from "../Remarks/RemarkInputSection";
import { useRemarkHandlers } from "../../hooks/useRemarkHandlers";
import dayjs from "dayjs";
import { useUnassignHandlers } from "../../hooks/useUnassignHandlers";
import { DetailsDialog } from "./DetailsDialog";
import { candidateDetailsFields } from "../Candidate/candidate-details-fields";
import AddFollowUpDialog from "./add-followup-dialog";
import ConfirmAndRemarkDialog from "./mark-as-done-dialog";
import { useSelector } from "react-redux";
import { EvaluationResult } from "@/lib/ai-providers/evaluation-provider";
import { CandidateDetailsTabs } from "./tabs/CandidateDetailsTabs";
import { CandidateDetailsActions } from "./tabs/CandidateDetailsActions";
import { getJobId } from "../../utils/candidateAccessors";
import { followUpSepretorPatternRegex } from "@/lib/constants";


export function CandidateDetailsDialog({
  candidate,
  isOpen,
  onOpenChange,
  onUpdate,
  hideEditButton = false,
  refetchAssignment,
  fromFilter,
  refetchCandidates,
  hideCloseButtons = false,
}: CandidateDetailsDialogProps) {
  const pathname = usePathname();
  const id = useParams()?.id as string;

  const [refetchCandidate, { data: candidateData }] =
    useLazyFetchCandidatesQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [isAssigningJob, setIsAssigningJob] = useState(false);
  // const [user, setuser] = useState<User | null>(null);
  const { user }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [confirmReEvaluateOpen, setConfirmReEvaluateOpen] = useState(false);
  const [isEditRemarkDialogOpen, setIsEditRemarkDialogOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState<IEditRemark | null>(null);
  const [timeLineItems, setTimeLineItems] = useState<ICandidateHistory[]>([]);
  const [isEvaluatingFor, setIsEvaluatingFor] = useState<string | null>(null);
  const [localCandidate, setLocalCandidate] = useState<Candidate | null>(
    candidate
  );
  const [activeTab, setActiveTab] = useState("overview");

  // History loading state
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [candidateHistory, setCandidateHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  // fetch candidate history when history tab is opened
  const fetchCandidateHistory = async () => {
    if (
      (!isRefetching && historyLoaded) ||
      !localCandidate?._id ||
      (isRefetching && isHistoryLoading)
    )
      return;

    // Only show loading indicator for initial fetch, not for refetches
    // if (!isRefetching) {
    //   setIsHistoryLoading(true);
    // }

    try {
      const response = await fetch(
        `/api/candidates/${localCandidate._id}/history`
      );
      if (response.ok) {
        const data = await response.json();
        setCandidateHistory(data.history || []);
        setHistoryLoaded(true);
      } else {
        console.error("Failed to fetch candidate history");
        if (!isRefetching) {
          toast({
            title: "Error",
            description: "Failed to load candidate history",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching candidate history:", error);
      if (!isRefetching) {
        toast({
          title: "Error",
          description: "Failed to load candidate history",
          variant: "destructive",
        });
      }
    } finally {
      if (!isRefetching) {
        setIsHistoryLoading(false);
      }
    }
  };

  // Load history when history tab is activated
  useEffect(() => {
    if ((activeTab === "history" || activeTab === "logs") && !historyLoaded) {
      fetchCandidateHistory();
    }
  }, [activeTab, historyLoaded, localCandidate?._id]);

  // Reset history state when candidate changes
  useEffect(() => {
    if (candidate?._id !== localCandidate?._id) {
      setHistoryLoaded(false);
      setIsHistoryLoading(false);
    }
  }, [localCandidate?._id, candidate?._id]);

  const refetch = async () => {
    setIsRefetching(true);
    const jobId = (id as string) || getJobId(candidate) || "";
    const result = await refetchCandidate(jobId);
    const updatedCandidate = result.data!.find((c) => {
      return c._id === localCandidate?._id;
    });

    // Fetch updated history silently if already loaded
    if (historyLoaded) {
      await fetchCandidateHistory();
    }

    // Update local candidate with the new data
    if (updatedCandidate) {
      setLocalCandidate({
        ...updatedCandidate,
        history: candidateHistory || [],
      });
    }
    setIsRefetching(false);
  };

  const {
    newRemark,
    setNewRemark,
    remarkRating,
    setRemarkRating,
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
  } = useRemarkHandlers(
    localCandidate,
    user,
    refetch,
    refetchAssignment,
    onUpdate,
    refetchCandidates
  );

  const {
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    isLoading,
    handleUnassign,
    confirmUnassign,
  } = useUnassignHandlers(
    localCandidate,
    user,
    refetch,
    setLocalCandidate,
    onUpdate,
    refetchAssignment,
    onOpenChange
  );

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleReEvaluationClick = () => {
    // Check if candidate already has AI scores (indicating previous evaluation)
    const hasExistingScores =
      localCandidate?.scores &&
      (localCandidate.scores.overall !== undefined ||
        localCandidate.scores.experience !== undefined ||
        localCandidate.scores.skills !== undefined ||
        localCandidate.scores.affordability !== undefined);

    if (hasExistingScores && !confirmReEvaluateOpen) {
      // Show confirmation dialog for re-evaluation
      setConfirmReEvaluateOpen(true);
    } else {
      // First time evaluation - proceed directly
      handleReEvaluation();
    }
  };

  const handleReEvaluation = async () => {
    setConfirmReEvaluateOpen(false);
    try {
      setIsReEvaluating(true);
      setIsEvaluatingFor(localCandidate?._id as string);
      const result: {
        candidate?: EvaluationResult;
      } = await evaluateCandidate(
        localCandidate?._id as string,
        evaluateCandidateMutation
      );
      if (!result.candidate) {
        return toast({
          title: "Error",
          description: (result as string) || "Failed to Re-evaluate the resume",
          variant: "destructive",
        });
      }
      toast({
        title: "Success",
        description: "Candidate re-evaluation completed successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Re-evaluation error:", error);
      toast({
        title: "Error",
        description: (error as string) || "Failed to re-evaluate candidate",
        variant: "destructive",
      });
    } finally {
      setIsReEvaluating(false);
    }
  };

  useEffect(() => {
    return () => {
      setNewRemark("");
      setRemarkRating(0);
      setRemarkRatingHistory(0);
    };
  }, []);

  useEffect(() => {
    // Update timeLineItems with the latest candidateHistory
    // This ensures the UI shows the most recent history data
    setTimeLineItems(candidateHistory || []);
  }, [candidateHistory]);

  useEffect(() => {
    if (isAddingFollowUp) {
      console.log(
        localCandidate?.followUp?.note,
        "localCandidate?.followUp?.note"
      );

      const parts = localCandidate?.followUp?.note
        ? localCandidate.followUp.note
            .split(followUpSepretorPatternRegex)
            .map((p) => p.trim())
            .filter(Boolean)
        : [];
      console.log(parts, "Parts --=  ");

      const followUpParts = parts.filter((p) => {
        if (p.endsWith("has completed the last step.")) {
          setMADFollowup(p);
          return false;
        } else {
          return true;
        }
      });

      console.log(followUpParts, "followUpParts = -iru8r8fi");

      // use the most recent follow-up note for editing, or empty string
      const userNote =
        followUpParts.length > 0 ? followUpParts[followUpParts.length - 1] : "";
      setNewFollowUp(userNote);

      if (localCandidate?.followUp?.date) {
        setNewFollowUpDate(dayjs(localCandidate.followUp.date));
      } else {
        setNewFollowUpDate(null);
      }
    }
  }, [isAddingFollowUp, localCandidate]);

  useEffect(() => {
    if (candidate) {
      setLocalCandidate(candidate);
      // Reset history state when candidate changes
      setHistoryLoaded(false);
    }
  }, [candidate, id]);

  // Reset active tab when dialog opens or candidate changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("overview");
    }
  }, [isOpen, candidate?._id]);

  if (!localCandidate) return null;

  const validTimeLineItems = timeLineItems.filter((item) => item.title !== "");
  const header = (
    <DialogHeader className="px-3 pt-3 pr-8 lg:px-4 lg:pt-4 lg:pr-10">
      {localCandidate && (
        <DetailsDialogHeader
          candidate={localCandidate}
          handleCandidateInfoCopy={handleCandidateInfoCopy}
          user={user}
          refetch={async () => {
            if (
              pathname !== "/dashboard" &&
              pathname !== "/dashboard/calendar"
            ) {
              await refetch();
            } else {
              await refetchAssignment?.();
            }
          }}
          onAssignClick={() => setIsAssigning(true)}
        />
      )}
    </DialogHeader>
  );
  const body = (
    <div className="flex-1 overflow-hidden flex flex-col">
      <CandidateDetailsTabs
        candidate={localCandidate}
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEditFollowUp={() => setIsAddingFollowUp(true)}
        onRemoveFollowUp={handleRemoveFollowUp}
        isReEvaluating={isReEvaluating}
        isEvaluatingFor={isEvaluatingFor}
        onReEvaluate={() => setConfirmReEvaluateOpen(true)}
        candidateHistory={candidateHistory}
        isHistoryLoading={isHistoryLoading}
        isRemarkSubmitting={isRemarkSubmitting}
        validTimeLineItems={validTimeLineItems}
        handleRemarkUpdate={handleRemarkUpdate}
        setEditingRemark={setEditingRemark}
        setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        historyLoaded={historyLoaded}
      />
    </div>
  );
  const footer = (
    <div className="flex flex-col space-y-4 bg-background px-6 py-4 pt-0">
      {/* Remark Input Section - Always visible */}
      {user?.role !== "candidate" && (
        <RemarkInputSection
          newRemark={newRemark}
          setNewRemark={setNewRemark}
          remarkRating={remarkRating}
          setRemarkRating={setRemarkRating}
          setRemarkRatingHistory={setRemarkRatingHistory}
          isSubRemarkPrivate={isSubRemarkPrivate}
          setIsSubRemarkPrivate={setIsSubRemarkPrivate}
          user={user}
          localCandidate={candidate}
          handleRemoveFollowUp={handleRemoveFollowUp}
          handleAddRemark={handleAddRemark}
          isRemarkSubmitting={isRemarkSubmitting}
        />
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <CandidateDetailsActions
          candidate={localCandidate}
          user={user}
          fromFilter={fromFilter}
          hideEditButton={hideEditButton}
          hideCloseButtons={hideCloseButtons}
          onAssign={() => setIsAssigning(true)}
          onUnassign={handleUnassign}
          onAddFollowUp={() => setIsAddingFollowUp(true)}
          onEdit={handleEditClick}
          onClose={() => {
            onOpenChange(false);
            setNewRemark("");
            setRemarkRating(null);
            setRemarkRatingHistory(null);
          }}
          onAssignJob={() => setIsAssigningJob(true)}
        />
      </div>
    </div>
  );

  return (
    <>
      <DetailsDialog
        open={isOpen && !isAssigning && !isEditing}
        onOpenChange={(e) => {
          setNewRemark("");
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          onOpenChange(e);
        }}
      >
        {header}
        {body}

        {user?.role !== "candidate" && footer}
      </DetailsDialog>
      {isAssigning && localCandidate && (
        <AssignCandidateDialog
          candidate={localCandidate}
          refetch={refetch}
          isOpen={isAssigning}
          onOpenChange={setIsAssigning}
          onUpdate={onUpdate || (() => {})}
          setLocalCandidate={setLocalCandidate}
          refetchAssignment={refetchAssignment}
          onSuccess={() => {
            if (pathname === "/dashboard/calendar") {
              setIsAssigning(false);
              onOpenChange(false);
            } else {
              refetch();
            }
          }}
        />
      )}
      {isAssigningJob && localCandidate && (
        <AssignJobDialog
          candidate={localCandidate}
          isOpen={isAssigningJob}
          onOpenChange={setIsAssigningJob}
          onJobAssignment={() => {
            refetchCandidates?.();
            onOpenChange(false);
            setIsAssigningJob(false);
          }}
        />
      )}
      {isAddingFollowUp && localCandidate && (
        <AddFollowUpDialog
          candidate={localCandidate}
          handleRemoveFollowUp={handleRemoveFollowUp}
          isOpen={isAddingFollowUp}
          onOpenChange={setIsAddingFollowUp}
          // onJobAssignment={() => {
          //   refetchCandidates?.();
          //   onOpenChange(false);
          //   setIsAssigningJob(false);
          // }}
          refetch={refetch}
          handleAddFollowUp={handleAddFollowUp}
          setNewFollowUp={setNewFollowUp}
          setNewFollowUpDate={setNewFollowUpDate}
          newFollowUp={newFollowUp}
          newFollowUpDate={newFollowUpDate}
          isLoading={isLoading}
          onAddingFollowup={async () => {
            // await refetchCandidates?.();
            // refetch();
            setIsAddingFollowUp(false);
            setIsAddingFollowUp(false);
            setNewFollowUp("");
            setNewFollowUpDate(null);
          }}
        />
      )}
      {isEditing && localCandidate && (
        <EditCandidateDialog
          candidate={localCandidate}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onUpdate={onUpdate || (() => {})}
          refetchAssignment={refetchAssignment}
          onSuccess={async () => {
            await refetch();
          }}
          reopenDetailsDialog={() => {
            onOpenChange(true);
          }}
        />
      )}
      <ConfirmAndRemarkDialog
        title="Mark as Done"
        message="Candidate will be Un-Assigned after marking as done."
        isOpen={confirmUnassignOpen}
        setIsOpen={setConfirmUnassignOpen}
        onConfirm={(note, rating) => {
          // debugger;
          confirmUnassign(note, rating);
        }}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
        // className="sm:max-w-[300px]"
      />
      {/* <ConfirmationDialog
        title="Mark as Done"
        message="Are you sure you want to mark this assignment as completed?"
        isOpen={confirmUnassignOpen}
        setIsOpen={setConfirmUnassignOpen}
        onConfirm={confirmUnassign}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
        className="sm:max-w-[300px]"
      /> */}
      <ConfirmationDialog
        title="Re-evaluate Candidate with AI?"
        message="This will use your active AI provider to re-analyze the candidate's resume and may incur additional costs based on your AI provider's pricing. The existing evaluation scores will be overwritten with new results."
        isOpen={confirmReEvaluateOpen}
        setIsOpen={setConfirmReEvaluateOpen}
        onConfirm={handleReEvaluationClick}
        onCancel={() => setConfirmReEvaluateOpen(false)}
        isLoading={isLoading}
        loadingText="Re-Evaluating with AI..."
        className="sm:max-w-[500px]"
      />
      <EditRemarkDialog
        isEditRemarkDialogOpen={isEditRemarkDialogOpen}
        setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        editingRemark={editingRemark}
        setEditingRemark={setEditingRemark}
        handleRemarkUpdate={handleRemarkUpdate}
        isLoading={isLoading}
        setRemarkRating={setRemarkRating}
        setRemarkRatingHistory={setRemarkRatingHistory}
      />
    </>
  );
}
