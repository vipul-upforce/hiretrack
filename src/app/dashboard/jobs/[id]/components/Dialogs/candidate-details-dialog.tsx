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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickTooltip } from "@/components/ui/tooltip";
import {
  User as UserIcon,
  MessageSquare,
  Clock,
  Bell,
  Edit,
  Trash2,
  HelpCircle,
  Trophy,
} from "lucide-react";
import { HistoryAndLogTable, LogsTable } from "../Candidate/HisotryAndLogTable";
import ResumeEvaluationDetails from "../Candidate/ResumeEvaluationDetails";
import { followUpSepretorPatternRegex, scoreColors } from "@/lib/constants";
import CandidateScoreCard from "../Utils/candidate-score-card";
import { useSelector } from "react-redux";
import { EvaluationResult } from "@/lib/ai-providers/evaluation-provider";
import { HistoryTimelineSkeleton } from "../Candidate/history-timeine-skeleton";

const labelClass = "font-semibold text-base";

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + "st";
  if (j === 2 && k !== 12) return num + "nd";
  if (j === 3 && k !== 13) return num + "rd";
  return num + "th";
};

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
    const result = await refetchCandidate(
      (id as string) || candidate?.jobId._id || ""
    );
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
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex flex-col h-full"
      >
        <TabsList
  className={`grid w-full ${
    user?.role === "interviewer" ? "grid-cols-2" : "grid-cols-3"
  } bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-12`}
>
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none h-full"
          >
            <UserIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none h-full"
          >
            <MessageSquare className="h-4 w-4" />
            History
          </TabsTrigger>
          {user?.role !== "candidate" && (
            <TabsTrigger
              value="logs"
              className={`flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none h-full ${user?.role === "interviewer" ? "hidden" : ""}`}
            >
              <Clock className="h-4 w-4" />
              Logs
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 py-3 lg:px-6 lg:py-4">
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Follow-up Section */}
            {(localCandidate?.followUp?.date ||
              localCandidate?.followUp?.note) &&
              user?.role !== "interviewer" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border-l-4 border-amber-400 dark:border-amber-500">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                            Follow-up Reminder
                          </h4>
                          {localCandidate.followUp.date && (
                            <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 px-2 py-1 rounded">
                              {new Date(
                                localCandidate.followUp.date
                              ).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(
                                localCandidate.followUp.date
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        {/* Split, reorder, and render follow-up notes with single separator */}
                        {localCandidate.followUp.note && (
                          <>
                            {(() => {
                              // Split by imported separator regex and handle extra newlines
                              const parts = localCandidate.followUp.note
                                .split(followUpSepretorPatternRegex)
                                .flatMap((part, partIndex) =>
                                  part
                                    .split(/\n+/) // Split by newlines to handle \n\n in regular notes
                                    .map((subPart) => subPart.trim())
                                    .filter((subPart) => subPart)
                                    .map((subPart, subIndex) => ({
                                      subPart,
                                      partIndex,
                                      subIndex,
                                    }))
                                )
                                .map((item, index) => ({ ...item, index }));

                              // Last non-empty part is the completion note (if multiple parts exist)
                              const completionNotes =
                                parts.length > 0
                                  ? [parts[parts.length - 1]]
                                  : [];
                              const otherNotes =
                                parts.length > 0
                                  ? parts.slice(0, -1)
                                  : parts.reverse(); // Reverse non-completion notes

                              // Show separator only if both completion and regular notes exist
                              const showSeparator =
                                completionNotes.length > 0 &&
                                otherNotes.length > 0;

                              // Render regular notes first
                              const regularNotesRender = otherNotes.map(
                                ({ subPart, index }) => (
                                  <div
                                    key={`note-${index}`}
                                    className="relative"
                                  >
                                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words">
                                      {subPart}
                                    </p>
                                  </div>
                                )
                              );

                              // Render completion note last
                              const completionNotesRender = completionNotes.map(
                                ({ subPart, index }) => (
                                  <div
                                    key={`note-${index}`}
                                    className="relative"
                                  >
                                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words font-semibold">
                                      {subPart}
                                    </p>
                                  </div>
                                )
                              );

                              // Combine with single separator if needed
                              return (
                                <>
                                  {regularNotesRender}
                                  {showSeparator && (
                                    <hr className="my-2 border-t border-amber-300 dark:border-amber-600" />
                                  )}
                                  {completionNotesRender}
                                </>
                              );
                            })()}
                          </>
                        )}
                        {localCandidate.followUp.userId && (
                          <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Created by:{" "}
                            <span className="font-bold">
                              {localCandidate.followUp.userId.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {(user?.role === "admin" || user?.role === "hr") && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAddingFollowUp(true);
                          }}
                          title="Edit Follow-up"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFollowUp();
                          }}
                          title="Remove Follow-up"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            {/* Skills */}
            {localCandidate.skills && localCandidate.skills.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Skills
                </h3>
                {candidateDetailsFields
                  .find((field) => field.id === "skills")
                  ?.render(localCandidate, user)}
              </div>
            )}

            {/* Custom Fields */}
            {localCandidate.customFields &&
              Object.keys(localCandidate.customFields).length > 0 && (
                <div className="space-y-4">
                  {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Meta Fields
                  </h3> */}
                  {candidateDetailsFields
                    .find((field) => field.id === "metafields")
                    ?.render(localCandidate, user)}
                </div>
              )}

            {/* Resume Section */}
            {localCandidate.resume && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Resume
                </h3>
                {candidateDetailsFields
                  .find((field) => field.id === "resume")
                  ?.render(localCandidate, user)}
              </div>
            )}

            {/* Attachments Section */}
            {localCandidate.attachments &&
              localCandidate.attachments.length > 0 && (
                <div className="space-y-4">
                  {candidateDetailsFields
                    .find((field) => field.id === "attachments")
                    ?.render(localCandidate, user)}
                </div>
              )}

            {/* AI Assessment Scores Section */}
            <div className="space-y-4">
              {localCandidate.scores?.overall !== undefined && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  AI Assessment Scores
                </h3>
              )}
              <div
                className={`grid grid-cols-2 gap-4 ${
                  localCandidate.scores?.comparativeRanking?.overallRank !==
                  undefined
                    ? "md:grid-cols-5"
                    : "md:grid-cols-4"
                }`}
              >
                {localCandidate.scores?.overall !== undefined &&
                  (() => {
                    const normalizedScore = Math.max(
                      1,
                      Math.min(10, localCandidate.scores.overall)
                    );

                    const overallScore = Math.round(normalizedScore);
                    const scoreColor = scoreColors[overallScore];

                    return (
                      <div
                        className={`${scoreColor.border} border-2 bg-transparent rounded-lg p-4 relative h-36 flex items-center justify-center`}
                      >
                        <div className="absolute top-3 right-3">
                          <svg
                            className={`w-5 h-5 ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                          >
                            {localCandidate.scores.overall}/10
                          </div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                            Overall Fit
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Combined assessment
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {localCandidate.scores?.experience !== undefined &&
                  (() => {
                    const normalizedScore = Math.max(
                      1,
                      Math.min(10, localCandidate.scores?.experience)
                    );
                    const experienceScore = Math.round(normalizedScore);
                    const scoreColor = scoreColors[experienceScore];

                    return (
                      <div
                        className={`${scoreColor.border} border-2 bg-transparent rounded-lg p-4 relative h-36 flex items-center justify-center`}
                      >
                        <div className="absolute top-3 right-3">
                          <svg
                            className={`w-5 h-5 ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                          >
                            {localCandidate.scores.experience}/10
                          </div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                            Experience
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Relevant experience match
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {localCandidate.scores?.skills !== undefined &&
                  (() => {
                    const normalizedScore = Math.max(
                      1,
                      Math.min(10, localCandidate.scores?.skills)
                    );
                    const skillsScore = Math.round(normalizedScore);
                    const scoreColor = scoreColors[skillsScore];

                    return (
                      <div
                        className={`${scoreColor.border} border-2 bg-transparent rounded-lg p-4 relative h-36 flex items-center justify-center`}
                      >
                        <div className="absolute top-3 right-3">
                          <svg
                            className={`w-5 h-5 ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                            />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                          >
                            {localCandidate.scores.skills}/10
                          </div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                            Skills Match
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Technical skills alignment
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                {localCandidate.scores?.affordability !== undefined &&
                  (() => {
                    const normalizedScore = Math.max(
                      1,
                      Math.min(10, localCandidate.scores?.affordability)
                    );
                    const affordabilityScore = Math.round(normalizedScore);
                    const scoreColor = scoreColors[affordabilityScore];

                    return (
                      <div
                        className={`${scoreColor.border} border-2 bg-transparent rounded-lg p-4 relative h-36 flex items-center justify-center`}
                      >
                        <div className="absolute top-3 right-3">
                          <svg
                            className={`w-5 h-5 ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div
                            className={`text-2xl font-bold ${scoreColor.text}`}
                            style={{
                              color: scoreColor.text,
                            }}
                          >
                            {localCandidate.scores.affordability}/10
                          </div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                            Affordability
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Cost-effectiveness match
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* Comparative Ranking Card */}
                {localCandidate.scores?.comparativeRanking &&
                  localCandidate.scores.comparativeRanking.overallRank !==
                    undefined &&
                  (() => {
                    const ranking = localCandidate.scores.comparativeRanking;
                    const rankDisplay = getOrdinalSuffix(ranking.overallRank);

                    // Convert percentile to score (0-100 percentile to 1-10 score)
                    const percentileScore = Math.max(
                      1,
                      Math.min(10, Math.round(ranking.percentile / 10))
                    );
                    const scoreColor = scoreColors[percentileScore];

                    const tooltipContent = (
                      <div className="space-y-2 p-1">
                        <div className="font-semibold text-xs mb-2">
                          Ranking Breakdown
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Skills:</span>
                            <span className="font-semibold">
                              {ranking.skillsPercentile} percentile
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">Experience:</span>
                            <span className="font-semibold">
                              {ranking.experiencePercentile} percentile
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-300">
                              Affordability:
                            </span>
                            <span className="font-semibold">
                              {ranking.affordabilityPercentile} percentile
                            </span>
                          </div>
                        </div>
                      </div>
                    );

                    return (
                      <QuickTooltip content={tooltipContent} side="top">
                        <div
                          className={`${scoreColor.border} border-2 bg-transparent rounded-lg p-4 relative cursor-help h-36 flex items-center justify-center`}
                        >
                          <div className="absolute top-3 right-3">
                            <Trophy
                              className={`w-5 h-5 ${scoreColor.text}`}
                              style={{ color: scoreColor.text }}
                            />
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-2xl font-bold ${scoreColor.text}`}
                              style={{ color: scoreColor.text }}
                            >
                              {rankDisplay}
                            </div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                              Candidate Rank
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {ranking.percentile} percentile •{" "}
                              {ranking.totalCandidates} total
                            </div>
                          </div>
                        </div>
                      </QuickTooltip>
                    );
                  })()}
              </div>
            </div>

            {/* Detailed AI Evaluation */}
            <div className="space-y-4">
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Detailed AI Evaluation
              </h3> */}
              <ResumeEvaluationDetails
                labelClass="font-semibold text-base"
                localCandidate={localCandidate}
                isReEvaluating={isReEvaluating}
                isEvaluatingFor={isEvaluatingFor}
                onReEvaluate={() => setConfirmReEvaluateOpen(true)}
              />
            </div>
          </TabsContent>
          <TabsContent value="history" className="space-y-6 mt-0">
            {/* Candidate History */}
            {user?.role !== "candidate" && (
              <div className="space-y-4 focus-visible:outline-none">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Candidate History
                </h3>
                {isHistoryLoading && !isRemarkSubmitting ? (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <HistoryTimelineSkeleton />
                  </div>
                ) : candidateHistory && candidateHistory.length > 0 ? (
                  candidateDetailsFields
                    .find((field) => field.id === "candidate-history")
                    ?.render(
                      { ...localCandidate, history: candidateHistory },
                      user,
                      validTimeLineItems,
                      handleRemarkUpdate,
                      setEditingRemark,
                      setIsEditRemarkDialogOpen,
                      false // showHeader = false
                    )
                ) : candidateHistory && candidateHistory.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <HistoryTimelineSkeleton />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No history found</h3>
                    <p className="text-muted-foreground">
                      No history entries found for this candidate.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Status History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Status History
              </h3>
              {candidateDetailsFields
                .find((field) => field.id === "status-history")
                ?.render(localCandidate, user)}
            </div>

            {/* Interview Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Interview Assignment
              </h3>
              {candidateDetailsFields
                .find((field) => field.id === "interview-assignment")
                ?.render(localCandidate, user)}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6 mt-0">
            {/* Show Logs Table - Direct content without button */}
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading Logs...
                </span>
              </div>
            ) : (
              user?.role !== "interviewer" &&
              user?.role !== "candidate" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Update Logs
                  </h3>
                  <LogsTable
                    isLoading={!historyLoaded}
                    candidate={localCandidate}
                    user={user}
                    timeLineItems={validTimeLineItems}
                  />
                </div>
              )
            )}
          </TabsContent>
        </div>
      </Tabs>
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
        {!fromFilter ? (
          <div className="flex justify-between w-full">
            {user?.role !== "candidate" && (
              <div className="flex gap-2">
                <Button
                  className={user?.role == "interviewer" ? "hidden" : ""}
                  variant="primary"
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
                    {localCandidate?.followUp?.note ||
                    localCandidate?.followUp?.date
                      ? "Edit Follow Up"
                      : "Add A Follow Up"}
                  </Button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {!hideEditButton && user?.role !== "interviewer" && (
                <Button
                  disabled={
                    user?.role === "candidate" &&
                    user.email !== candidate?.email
                  }
                  variant="secondary"
                  onClick={handleEditClick}
                >
                  Edit
                </Button>
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
            <Button variant="primary" onClick={() => setIsAssigningJob(true)}>
              Assign Job
            </Button>
          </div>
        )}
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
