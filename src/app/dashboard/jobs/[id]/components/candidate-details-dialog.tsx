"use client";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { Candidate } from "@/types/candidate";
import { EditCandidateDialog } from "./edit-candidate-dialog";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  useEvaluateCandidateMutation,
  useLazyFetchCandidatesQuery,
  useUpdateCandidateHistoryMutation,
  useUpdateCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { AssignCandidateDialog } from "./assign-candidate-dialog";
import { usePathname } from "next/navigation";
import { ICandidateHistory } from "@/lib/models/history";
import ExpandableDescription from "./expand-collapse-desc";
import { AssignJobDialog } from "./assing-job-dialog";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { User } from "@/lib/features/users/usersApi";
import { useSendUnassignMailMutation } from "@/lib/features/org/orgApi";
import { evaluateCandidate } from "@/app/apply-jobs/ApplyAsGuest";
import { CandidateDetailsDialogProps } from "../schemas/candidateDetailsDialogProps";
import { IEditRemark } from "../schemas/EditRemarkDialog";
import EditRemarkDialog from "./EditRemarkDialog";
import ConfirmationDialog from "./ConfirmationDialog";
import handleCandidateInfoCopy from "../hooks/handleCandidateInfoCopy";
import RenderHistoryEntry from "./HistoryEntry";
import { RenderAttachments } from "./RenderAttachments";
import ResumeEvaluationDetails from "./ResumeEvaluationDetails";
import DetailsDialogHeader from "./candidate-details-header";
import RemarkInputSection from "./RemarkInputSection";
import { CandidateInfoSection } from "./CandidateInfoSection";
import { formatDate, formatTime } from "../hooks/dateTimeFormatting";
import CustomFieldsData from "@/Custom_Fields/Components/CustomFields/customFields-details";

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
}: CandidateDetailsDialogProps) {
  const pathname = usePathname();
  const id = useParams()?.id as string;

  const [refetchCandidate, { data: candidateData }] =
    useLazyFetchCandidatesQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [remarkRating, setRemarkRating] = useState<number | null>(null);
  const [remarkRatingHistory, setRemarkRatingHistory] = useState<number | null>(
    null
  );
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [updateCandidate] = useUpdateCandidateMutation();
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssigningJob, setIsAssigningJob] = useState(false);
  const [user, setuser] = useState<User | null>(null);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [updateCandidateHistory] = useUpdateCandidateHistoryMutation();
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(false);
  const [confirmReEvaluateOpen, setConfirmReEvaluateOpen] = useState(false);
  const [isEditRemarkDialogOpen, setIsEditRemarkDialogOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState<IEditRemark | null>(null);
  const [timeLineItems, setTimeLineItems] = useState<ICandidateHistory[]>([]);
  const [localCandidate, setLocalCandidate] = useState<Candidate | null>(
    candidate
  );
  const [sendUnassignEmail, { isLoading }] = useSendUnassignMailMutation();

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

  const handleEditClick = () => {
    setIsEditing(true); // Open the edit dialog
    onOpenChange(false); // Close the current dialog
  };

  const handleRemarkUpdate = async (
    id: string,
    description: string,
    isPrivate?: boolean
  ) => {
    setIsEditRemarkDialogOpen(false);
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

      if (pathname === "/dashboard") {
        refetchAssignment?.();
      }
      if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
        refetch();
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

  const handleReEvaluation = async () => {
    setConfirmReEvaluateOpen(false);
    try {
      setIsReEvaluating(true);

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
    if (candidateData || localCandidate) {
      if (!candidateData && localCandidate) {
        const currentCandidate = localCandidate;
        if (currentCandidate && currentCandidate.history) {
          setTimeLineItems(currentCandidate.history || []);
        }
      } else if (candidateData && localCandidate) {
        const currentCandidate = candidateData.find(
          (c) => c._id === localCandidate._id
        );
        if (currentCandidate && currentCandidate.history) {
          setTimeLineItems(currentCandidate.history || []);
        }
      }
    }
  }, [candidateData, localCandidate]);

  useEffect(() => {
    if (candidate) {
      setLocalCandidate(candidate);
    }
  }, [candidate, id]);

  const handleAddRemark = async () => {
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
      const newHistoryEntry = {
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
      const result = await updateCandidate(updateData).unwrap();
      if (onUpdate && result) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await onUpdate(result);
      }
      if (pathname === "/dashboard") {
        await refetchAssignment?.();
      }
      if (pathname !== "/dashboard" && pathname !== "/dashboard/calendar") {
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

  const handleUnassign = () => {
    setConfirmUnassignOpen(true);
  };

  const confirmUnassign = async () => {
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
            description: "",
            date: "",
            rating: 0,
            userId: null,
          },
          attachments: [],
        };
        // debugger;
        await updateCandidateHistory({
          candidateId: updatedCandidate._id || "",
          jobId: localCandidate?.jobId._id || localCandidate?.jobId || "",
          newEntry: newHistoryEntry,
        }).unwrap();
        sendUnassignEmail({ name: result.name });

        if (pathname === "/dashboard/calendar") {
          setIsAssigning(false);
          onOpenChange(false);
        }
        // debugger;
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
    }
  };

  if (!localCandidate) return null;

  const validTimeLineItems = timeLineItems.filter((item) => item.title !== "");

  return (
    <>
      <Dialog
        open={isOpen && !isAssigning}
        onOpenChange={(e) => {
          setNewRemark("");
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          onOpenChange(e);
        }}
      >
        <DialogContent className="sm:max-w-[80vw] xl:max-w-[50vw] h-[90vh] p-0 overflow-hidden flex flex-col justify-start">
          <DialogHeader className="px-6 pt-6">
            {candidate && (
              <DetailsDialogHeader
                candidate={candidate}
                handleCandidateInfoCopy={handleCandidateInfoCopy}
              />
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 pt-0 space-y-6">
            <div className="space-y-1 relative">
              <Label className={labelClass}>
                {localCandidate.jobId?.title ||
                  localCandidate.jobDetails?.title ||
                  "Job Description"}
              </Label>
              <ExpandableDescription
                description={
                  localCandidate.jobId?.description ||
                  localCandidate.jobDetails?.description ||
                  "No description Found"
                }
              />
            </div>
            {candidate && (
              <CandidateInfoSection
                candidate={candidate}
                user={user}
                labelClass={labelClass}
              />
            )}

            <div className="space-y-2">
              <Label className={labelClass}>Skills</Label>
              <div className="flex flex-wrap gap-2">
                {localCandidate.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <CustomFieldsData
              customFields={localCandidate?.customFields || {}}
            />

            {localCandidate.scores && (
              <ResumeEvaluationDetails
                labelClass={labelClass}
                localCandidate={localCandidate}
                isReEvaluating={isReEvaluating}
                onReEvaluate={() => setConfirmReEvaluateOpen(true)}
              />
            )}

            <div className="space-y-2">
              <Label className={labelClass}>Resume</Label>
              {localCandidate.resume && (
                <PDFViewer files={[localCandidate.resume]} />
              )}
            </div>

            {localCandidate.attachments.length > 0 && (
              <RenderAttachments
                labelClass={labelClass}
                localCandidate={localCandidate}
              />
            )}

            <div className="space-y-2">
              <Label className={labelClass}>Candidate History</Label>
              <ol className="relative border-s border-gray-200 dark:border-gray-700">
                {validTimeLineItems.length > 0
                  ? validTimeLineItems
                      .reverse()
                      .filter((interview) => {
                        if (
                          !interview.remark ||
                          !interview.remark.description
                        ) {
                          return true;
                        }
                        return (
                          !interview.remark.isPrivate ||
                          user?.role === "hr" ||
                          user?.role === "admin"
                        );
                      })
                      .map((interview, i) => {
                        const timeDate = formatDate(interview.dateTime);
                        const timeTime = formatTime(interview.dateTime);
                        return (
                          <RenderHistoryEntry
                            interview={interview}
                            indexKey={i}
                            localCandidate={localCandidate}
                            user={user}
                            timeDate={timeDate}
                            timeTime={timeTime}
                            handleRemarkUpdate={handleRemarkUpdate}
                            setEditingRemark={setEditingRemark}
                            setIsEditRemarkDialogOpen={
                              setIsEditRemarkDialogOpen
                            }
                            key={i}
                          />
                        );
                      })
                  : "No History"}
              </ol>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Status History</Label>
              <div className="space-y-2">
                <div className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    Created: {formatDate(localCandidate.tracking?.createdAt)}
                  </span>
                </div>
                {localCandidate.tracking?.assignedToJobDate && (
                  <div className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>
                      Job Assigned:{" "}
                      {formatDate(localCandidate.tracking?.assignedToJobDate)}
                    </span>
                  </div>
                )}
                <div className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    Last Updated:{" "}
                    {formatDate(localCandidate.tracking?.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assignment Management */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Interview Assignment</h3>
              {localCandidate?.assignment ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>
                      Interviewer:{" "}
                      {typeof localCandidate.assignment.interviewerId ===
                        "object" && localCandidate.assignment.interviewerId
                        ? localCandidate.assignment.interviewerId.name
                        : "Unknown"}
                    </span>
                  </div>
                  <div>
                    Interview Date: {formatDate(localCandidate.assignment.time)}{" "}
                    on {formatTime(localCandidate.assignment.time)}
                  </div>
                </div>
              ) : (
                <div>Not assigned to any interviewer</div>
              )}
            </div>

            <RemarkInputSection
              newRemark={newRemark}
              setNewRemark={setNewRemark}
              remarkRating={remarkRating}
              setRemarkRating={setRemarkRating}
              setRemarkRatingHistory={setRemarkRatingHistory}
              isSubRemarkPrivate={isSubRemarkPrivate}
              setIsSubRemarkPrivate={setIsSubRemarkPrivate}
              user={user}
              handleAddRemark={handleAddRemark}
            />
          </div>

          <div className="flex space-x-2 border-t bg-background px-6 py-4">
            {!fromFilter ? (
              <div className="flex justify-between w-full">
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
                </div>
                <div className="flex gap-2">
                  {!hideEditButton && (
                    <Button onClick={handleEditClick}>Edit</Button>
                  )}
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
                </div>
              </div>
            ) : (
              <div>
                <Button onClick={() => setIsAssigningJob(true)}>
                  Assign Job
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
            // debugger;
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
      {isEditing && localCandidate && (
        <EditCandidateDialog
          candidate={localCandidate}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onUpdate={onUpdate || (() => {})}
          refetchAssignment={refetchAssignment}
          onSuccess={() => {
            refetch();
          }}
          reopenDetailsDialog={() => {
            onOpenChange(true);
          }}
        />
      )}
      <ConfirmationDialog
        title="Mark as Done"
        message="Are you sure you want to mark this assignment as complete?"
        isOpen={confirmUnassignOpen}
        setIsOpen={setConfirmUnassignOpen}
        onConfirm={confirmUnassign}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
        className="sm:max-w-[300px]"
      />

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
