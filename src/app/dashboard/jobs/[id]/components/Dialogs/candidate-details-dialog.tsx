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
import { useUnassignHandlers } from "../../hooks/useUnassignHandlers";
import { DetailsDialog } from "./DetailsDialog";
import { candidateDetailsFields } from "../Candidate/candidate-details-fields";
import AddFollowUpDialog from "./add-followup-dialog";
import ConfirmAndRemarkDialog from "./mark-as-done-dialog";

const labelClass = "font-semibold text-base";

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
  const [user, setuser] = useState<User | null>(null);
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [confirmReEvaluateOpen, setConfirmReEvaluateOpen] = useState(false);
  const [isEditRemarkDialogOpen, setIsEditRemarkDialogOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState<IEditRemark | null>(null);
  const [timeLineItems, setTimeLineItems] = useState<ICandidateHistory[]>([]);
  const [isEvaluatingFor, setIsEvaluatingFor] = useState<string | null>(null);
  const [localCandidate, setLocalCandidate] = useState<Candidate | null>(
    candidate
  );
  const refetch = async () => {
    const result = await refetchCandidate(
      (id as string) || candidate?.jobId._id || ""
    );
    const updatedCandidate = result.data!.find((c) => {
      return c._id === localCandidate?._id;
    });
    setLocalCandidate(updatedCandidate!);
  };
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

  // const {
  //   handleFollowUp,
  //   setConfirmUnassignOpen,
  //   isLoading,
  //   handleUnassign,
  //   confirmUnassign,
  // } = useUnassignHandlers(
  //   localCandidate,
  //   user,
  //   refetch,
  //   setLocalCandidate,
  //   onUpdate,
  //   refetchAssignment,
  //   onOpenChange
  // );
  const handleEditClick = () => {
    setIsEditing(true); // Open the edit dialog
    onOpenChange(false); // Close the current dialog
  };

  const handleReEvaluation = async () => {
    setConfirmReEvaluateOpen(false);
    try {
      setIsReEvaluating(true);
      setIsEvaluatingFor(localCandidate?._id as string);
      const result = await evaluateCandidate(
        localCandidate?._id as string,
        evaluateCandidateMutation
      );
      if (!result) {
        return toast({
          title: "Error",
          description: "Failed to Re-evaluate the resume",
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
        description: "Failed to re-evaluate candidate",
        variant: "destructive",
      });
    } finally {
      setIsReEvaluating(false);
      if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
        await refetch();
      } else {
        await refetchAssignment?.();
      }
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
    if (isEditing) {
      onOpenChange(false); // Close the details dialog only when editing starts
    }
  }, [isEditing, onOpenChange]);

  useEffect(() => {
    // if (candidateData || localCandidate) {
    //   console.log("🛴🛴🛴 ", localCandidate?.history);
    //   console.log(
    //     "🛹🛹🛹 ",
    //     candidateData?.find((c) => c._id === localCandidate?._id)?.history
    //   );
    //   if (!candidateData && localCandidate) {
    //     const currentCandidate = localCandidate;
    //     if (currentCandidate && currentCandidate.history) {
    //       setTimeLineItems(currentCandidate.history || []);
    //     }
    //   } else if (candidateData && localCandidate) {
    //     const currentCandidate = candidateData.find(
    //       (c) => c._id === localCandidate._id
    //     );
    //     if (currentCandidate && currentCandidate.history) {
    //       setTimeLineItems(currentCandidate.history || []);
    //     }
    //   }
    // }
    const currentCandidate = localCandidate;
    setTimeLineItems(currentCandidate?.history || []);
  }, [candidateData, localCandidate]);

  useEffect(() => {
    if (isAddingFollowUp) {
      setNewFollowUp(localCandidate?.followUp?.note || "");
    }
  }, [isAddingFollowUp, localCandidate]);

  useEffect(() => {
    if (candidate) {
      setLocalCandidate(candidate);
    }
  }, [candidate, id]);

  if (!localCandidate) return null;
  // console.log("TimeLine Items: ", timeLineItems);
  const validTimeLineItems = timeLineItems.filter((item) => item.title !== "");
  const header = (
    <DialogHeader className="px-6 pt-6">
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
        />
      )}
    </DialogHeader>
  );
  const body = (
    <div className="flex-1 overflow-y-auto px-6 py-4 pt-4 border-y space-y-6">
      {candidateDetailsFields.map((field, index) => {
        if (field.shouldRender && !field.shouldRender(localCandidate))
          return null;
        return (
          <div key={index} className="space-y-2">
            <Label className={labelClass}>
              {field.label.split(" |||||(")[0]}
            </Label>
            {field.id === "ai-evaluation"
              ? field.render(
                  localCandidate,
                  user,
                  isReEvaluating,
                  isEvaluatingFor,
                  () => setConfirmReEvaluateOpen(true)
                )
              : field.render(
                  localCandidate,
                  user,
                  validTimeLineItems,
                  handleRemarkUpdate,
                  setEditingRemark,
                  setIsEditRemarkDialogOpen
                )}
          </div>
        );
      })}
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
    </div>
  );
  const footer = (
    <div className="flex space-x-2  bg-background px-6 py-4 pt-0">
      {!fromFilter ? (
        <div className="flex justify-between w-full">
          {user?.role !== "candidate" && (
            <div className="flex gap-2">
              <Button
                className={user?.role == "interviewer" ? "hidden" : ""}
                onClick={() => setIsAssigning(true)}
              >
                Assign To
              </Button>
              <Button
                onClick={handleUnassign}
                disabled={!localCandidate.assignment}
                variant="outline"
              >
                Mark As Done
              </Button>

              {user?.role !== "interviewer" && (
                <Button
                  onClick={() => setIsAddingFollowUp(true)}
                  // disabled={!localCandidate.assignment}
                  variant="outline"
                >
                  Add A Follow Up
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            {!hideEditButton && user?.role !== "interviewer" && (
              <Button onClick={handleEditClick}>Edit</Button>
            )}
            {!hideCloseButtons && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setNewRemark("");
                  setRemarkRating(null);
                  setRemarkRatingHistory(null);
                }}
              >
                Close
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Button onClick={() => setIsAssigningJob(true)}>Assign Job</Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DetailsDialog
        open={isOpen && !isAssigning}
        onOpenChange={(e) => {
          setNewRemark("");
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          onOpenChange(e);
        }}
      >
        {header}
        {body}
        {footer}
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
          onAddingFollowup={async () => {
            // await refetchCandidates?.();
            // refetch();
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
        title="Are You Sure?"
        message="This will overwrite existing candidate score data with new
              results."
        isOpen={confirmReEvaluateOpen}
        setIsOpen={setConfirmReEvaluateOpen}
        onConfirm={() => handleReEvaluation()}
        onCancel={() => setConfirmReEvaluateOpen(false)}
        isLoading={isLoading}
        loadingText="Re-Evaluating"
        className="sm:max-w-[400px]"
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
