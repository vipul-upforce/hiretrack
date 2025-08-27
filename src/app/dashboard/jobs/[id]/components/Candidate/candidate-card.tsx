"use client";

import { Draggable, DraggableProvided } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArchiveRestore,
  Info,
  Trash2,
  MoreVertical,
  Edit,
  UserPlus,
  CheckCircle,
  MessageSquare,
  Plus,
  Eye,
  Bell,
  MessageCircle,
} from "lucide-react";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import RemarksPopover from "../Remarks/remarks-popover";
import { GridCircularScores } from "../Utils/circular-score";
import FollowupDisplay from "../Remarks/followup-popover";
import { useRemarkHandlers } from "../../hooks/useRemarkHandlers";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { User } from "@/lib/features/users/usersApi";
import TagsList from "@/components/ui/tagsList";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import CustomFieldBadge from "./CustomFieldBadge";
import { CalendarClockIcon } from "lucide-react";
import { Trash2Icon } from "lucide-react";
import {
  MapPin,
  Clock,
  Star,
  Mail,
  Calendar,
  Copy,
  Phone,
  RefreshCw,
  Video,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmationDialog from "../Dialogs/ConfirmationDialog";
import { EditCandidateDialog } from "../Dialogs/edit-candidate-dialog";
import { AssignCandidateDialog } from "../Dialogs/assign-candidate-dialog";
import AddFollowUpDialog from "../Dialogs/add-followup-dialog";
import ConfirmAndRemarkDialog from "../Dialogs/mark-as-done-dialog";
import { useUnassignHandlers } from "../../hooks/useUnassignHandlers";
import { cn } from "@/lib/utils";
import AttachmentsPopover from "../Remarks/attachments-popover";
import { useToast } from "@/hooks/use-toast";
import { EmailCandidateDialog } from "../Dialogs/email-candidate-dialog";
import { useSelector } from "react-redux";
import AddRemarksDialog from "../Dialogs/add-remark-dialog";

interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  onViewDetails: (candidate: Candidate) => void;
  onDashboard?: boolean;
  onDeleteClick?: (candidateId: string) => void;
  openRemarks: boolean;
  setOpenRemarksFor: (id: string | null) => void;
  refetch: () => void;
  className?: string;
  onEditClick?: (candidate: Candidate) => void;
  isPending?: boolean; // New prop to indicate if card is awaiting checklist completion
  onAssignClick?: (candidate: Candidate) => void;
  onMarkAsDoneClick?: (candidate: Candidate) => void;
  onFollowUpClick?: (candidate: Candidate) => void;
  onAddRemarkClick?: (candidate: Candidate) => void;
}

export function CandidateCard({
  candidate,
  index,
  onViewDetails,
  openRemarks,
  setOpenRemarksFor,
  refetch,
  onDashboard = false,
  onDeleteClick,
  className,
  onEditClick,
  onAssignClick,
  onMarkAsDoneClick,
  onFollowUpClick,
  onAddRemarkClick,
  isPending = false,
}: CandidateCardProps) {
  const { formNameObject } = useCustomForm("Candidate");
  // const [user, setUser] = useState<User | null>(null);
  const { user } = useSelector((state: any) => state.auth || {});
  const [removeFUOpen, setRemoveFUOpenLocal] = useState(false);
  const { handleRemoveFollowUp } = useRemarkHandlers(candidate, user, refetch);
  const { toast } = useToast();
  const [isAddRemarkOpen, setIsAddRemarkOpen] = useState(false);

  // Local state for candidate data to handle sync updates
  const [localCandidate, setLocalCandidate] = useState(candidate);
  const [isSyncing, setIsSyncing] = useState(false);

  // State for menu actions
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  // Update local candidate when prop changes
  useEffect(() => {
    setLocalCandidate(candidate);
  }, [candidate]);

  // Handlers for menu actions
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
    isFollowUpSubmitting,
  } = useRemarkHandlers(
    localCandidate, // Use localCandidate instead of candidate
    user,
    async () => refetch(),
    undefined,
    undefined,
    undefined
  );

  const { isLoading, handleUnassign, confirmUnassign } = useUnassignHandlers(
    localCandidate, // Use localCandidate instead of candidate
    user,
    async () => refetch(),
    () => {},
    () => {},
    undefined,
    undefined
  );

  // Function to handle sync attendee responses
  const handleSyncAttendeeResponses = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!localCandidate.assignment?.googleMeet?.eventId) {
      toast({
        title: "Sync Failed",
        description: "No event ID found for this meeting.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      const response = await fetch("/api/google-calendar/sync-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId: localCandidate._id,
          eventId: localCandidate.assignment.googleMeet.eventId,
        }),
      });

      if (response.ok) {
        const syncData = await response.json();

        // Update local candidate with new attendee responses
        if (syncData.success && syncData.data.attendeeResponses) {
          setLocalCandidate((prevCandidate) => ({
            ...prevCandidate,
            assignment: {
              ...prevCandidate.assignment!,
              googleMeet: {
                ...prevCandidate.assignment!.googleMeet!,
                attendeeResponses: syncData.data.attendeeResponses,
              },
            },
          }));
        }

        toast({
          title: "Sync Successful",
          description:
            syncData.data.notificationsSent > 0
              ? `Updated attendee responses. ${syncData.data.notificationsSent} notifications sent.`
              : syncData.data.changesDetected
                ? "Attendee responses updated successfully."
                : "Attendee responses are up to date.",
        });
      } else {
        throw new Error("Sync failed");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: "Unable to sync attendee responses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate average score across all categories
  const calculateAverageScore = () => {
    if (!localCandidate.scores) return 0;

    const scores = [
      localCandidate.scores.overall,
      localCandidate.scores.experience,
      localCandidate.scores.skills,
      localCandidate.scores.affordability,
    ].filter((score) => score !== undefined && score >= 0);

    if (scores.length === 0) return 0;

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const averageScore = calculateAverageScore();
  const showStar = averageScore > 7;

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Update follow-up state when dialog opens for editing
  useEffect(() => {
    if (isAddingFollowUp) {
      setNewFollowUp(localCandidate?.followUp?.note || "");
      if (localCandidate?.followUp?.date) {
        setNewFollowUpDate(dayjs(localCandidate.followUp.date));
      } else {
        setNewFollowUpDate(null);
      }
    }
  }, [isAddingFollowUp, localCandidate]);

  const renderCardContent = () => (
    <div className="flex flex-col h-full relative">
      {/* Main content area - will expand to fill available space */}
      <div className="flex-1 flex flex-col">
        {/* Header with name and buttons */}
        <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-2">
              {showStar && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">High-scoring candidate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight truncate">
                {localCandidate.name}
              </h3>
            </div>
            {localCandidate.tags && <TagsList candidate={localCandidate} />}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {/* Add Remarks Button - handled by main page ChecklistRemarksDialog */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                setOpenRemarksFor(localCandidate._id);
                setIsAddRemarkOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Remark Popover */}
            <RemarksPopover
              candidate={localCandidate}
              onMoreClick={() => onViewDetails(localCandidate)}
            />

            {/* View Details Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(localCandidate);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* 3-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* View Details - Always available */}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(localCandidate);
                  }}
                >
                  <Info className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>

                {/* Edit - Only for non-candidate roles and when not deleted */}
                {user?.role !== "candidate" && !localCandidate.isDeleted && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}

                {/* Email - Only for non-candidate roles */}
                {user?.role !== "candidate" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEmailDialogOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                )}

                {/* Assign To - Only for non-interviewer roles and when not deleted */}
                {user?.role !== "interviewer" && !localCandidate.isDeleted && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAssigning(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign To
                  </DropdownMenuItem>
                )}

                {/* Mark as Done - Only when assigned and not deleted */}
                {localCandidate.assignment && !localCandidate.isDeleted && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmUnassignOpen(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Done
                  </DropdownMenuItem>
                )}

                {/* Add/Edit Follow Up - Only for non-interviewer roles */}
                {user?.role !== "interviewer" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingFollowUp(true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {localCandidate.followUp
                      ? "Edit Follow Up"
                      : "Add Follow Up"}
                  </DropdownMenuItem>
                )}

                {/* Add Remark - Only for non-candidate roles */}
                {user?.role !== "candidate" && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRemarksFor(localCandidate._id);
                      setIsAddRemarkOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Remark
                  </DropdownMenuItem>
                )}

                {/* Separator before delete */}
                {!onDashboard && <DropdownMenuSeparator />}

                {/* Delete/Archive - Only when not on dashboard */}
                {!onDashboard && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick?.(localCandidate._id);
                    }}
                    className={
                      localCandidate.isDeleted
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {localCandidate.isDeleted ? (
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {localCandidate.isDeleted ? "Restore" : "Delete"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Follow-up Section - Just below header */}
        {localCandidate.followUp && localCandidate.followUp.note && (
          <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border-l-4 border-amber-400 dark:border-amber-500">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {localCandidate.followUp.date && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                      {formatDate(localCandidate.followUp.date)} at{" "}
                      {formatTime(localCandidate.followUp.date)}
                    </div>
                  )}
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words">
                    {localCandidate.followUp.note as string}
                  </p>
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
              {user?.role !== "candidate" && user?.role !== "interviewer" && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingFollowUp(true);
                    }}
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors duration-200"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoveFUOpenLocal(true);
                    }}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                  >
                    <Trash2Icon size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Information Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Experience
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
                {localCandidate.experience} years
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Location
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
                {localCandidate.location}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <span className="h-4 w-4 flex-shrink-0 text-sm font-semibold">
              ₹
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Expected CTC
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
                {localCandidate.expectedCTC} LPA
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Notice Period
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
                {localCandidate.noticePeriod
                  ? `${localCandidate.noticePeriod} days`
                  : "-"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <span className="h-4 w-4 flex-shrink-0 text-sm font-semibold opacity-60">
              ₹
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Current CTC
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
                {localCandidate.currentCTC
                  ? `${localCandidate.currentCTC} LPA`
                  : "-"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Contact
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-900 dark:text-gray-100 font-semibold truncate flex-1 min-w-0">
                  {localCandidate.contact || "N/A"}
                </span>
                {localCandidate.contact && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(localCandidate.contact, "Contact number");
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {localCandidate.email && (
            <div className="col-span-2 flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                  Email
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-900 dark:text-gray-100 font-semibold flex-1 min-w-0">
                    {localCandidate.email}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(localCandidate.email, "Email");
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Skills */}
        {localCandidate.skills && localCandidate.skills.length > 0 && (
          <div className="mb-5">
            <div className="mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-medium truncate">
                Skills
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {localCandidate.skills.slice(0, 4).map((skill, index) => (
                <Badge
                  key={`${localCandidate._id}-skill-${index}-${skill}`}
                  variant="secondary"
                  className="text-xs px-2.5 py-1 bg-gray-100 text-gray-900 border border-gray-200 dark:bg-black dark:text-gray-100 dark:border-gray-700 font-medium truncate max-w-full"
                  title={skill}
                >
                  {skill}
                </Badge>
              ))}
              {localCandidate.skills.length > 4 && (
                <Badge
                  key="more-skills"
                  variant="secondary"
                  className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 font-medium flex-shrink-0"
                >
                  +{localCandidate.skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Custom fields */}
        {localCandidate.customFields &&
          Object.entries(localCandidate.customFields).filter(([key, value]) => {
            const field = formNameObject?.fields.find((f) => f.label === key);
            if (field?.candidateId && field.candidateId !== localCandidate._id)
              return false;
            return (
              field?.showOnCard &&
              value != null &&
              value !== "" &&
              (!Array.isArray(value) || value.length > 0)
            );
          }).length > 0 && (
            <div className="mb-3 space-y-2">
              {Object.entries(localCandidate.customFields)
                .filter(([key, value]) => {
                  const field = formNameObject?.fields.find(
                    (f) => f.label === key
                  );
                  if (
                    field?.candidateId &&
                    field.candidateId !== localCandidate._id
                  )
                    return false;
                  return (
                    field?.showOnCard &&
                    value != null &&
                    value !== "" &&
                    (!Array.isArray(value) || value.length > 0)
                  );
                })
                .map(([key, value], i) => (
                  <div key={i} className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {key.split(" |||||(")[0]}:
                    </span>
                    {typeof value === "string" ? (
                      <span className="font-semibold text-orange-700 dark:text-orange-400">
                        {value}
                      </span>
                    ) : Array.isArray(value) && value.length > 0 ? (
                      <AttachmentsPopover
                        attachments={value.map((file, index) => {
                          if (typeof file === "string") {
                            return {
                              id: "",
                              name: "",
                              url: "",
                              type: "",
                              size: 0,
                            };
                          }
                          return {
                            id: `${key}-${index}-${file.name}`,
                            name: file.name,
                            url: file.base64 || "#",
                            type: file.type || "unknown",
                            size: file.size || 0,
                          };
                        })}
                        onMoreClick={() => null}
                      />
                    ) : (
                      "default"
                    )}
                  </div>
                ))}
            </div>
          )}
      </div>

      {/* Bottom Section Container - Contains Scores and Follow-up */}
      <div className="mt-auto">
        {/* Scores Section */}
        {localCandidate.scores &&
          localCandidate.scores.overall !== undefined && (
            <div className="mb-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-medium truncate">
                  Evaluation Scores
                </span>
              </div>
              <GridCircularScores scores={localCandidate.scores} />
            </div>
          )}
      </div>

      {/* Confirmation dialog for removing follow-up */}
      {removeFUOpen && (
        <ConfirmationDialog
          title="Remove Follow Up"
          message="Are you sure you want to remove this followup?"
          isOpen={removeFUOpen}
          setIsOpen={setRemoveFUOpenLocal}
          onConfirm={() => {
            handleRemoveFollowUp();
            setRemoveFUOpenLocal(false);
          }}
          onCancel={() => setRemoveFUOpenLocal(false)}
          loadingText="Removing..."
          className="sm:max-w-[300px]"
        />
      )}

      {/* Interview details footer - Fixed at bottom */}
      {localCandidate.assignment &&
        localCandidate.assignment.interviewerId &&
        typeof localCandidate.assignment.interviewerId === "object" &&
        localCandidate.assignment.interviewerId._id &&
        localCandidate.assignment?.googleMeet?.eventId &&
        localCandidate.assignment.interviewerId.name && (
          <div
            className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black/70 -mx-4 -mb-4 px-4 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsAssigning(true);
            }}
          >
            <div className="flex items-center justify-between gap-2 min-h-[20px]">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <CalendarClockIcon
                  size={12}
                  className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  Assigned to{" "}
                  <span className="font-semibold">
                    {localCandidate.assignment.interviewerId.name}
                  </span>
                  {localCandidate.assignment?.googleMeet && (
                    <Badge
                      variant="default"
                      className="ml-2 text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                    >
                      <Video size={10} className="mr-1" />
                      Google Meet
                    </Badge>
                  )}
                </span>
                {localCandidate.assignment?.googleMeet && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 relative",
                            localCandidate.assignment.googleMeet.attendeeResponses?.some(
                              (a) => a.responseStatus === "declined"
                            )
                              ? "bg-red-500 hover:bg-red-600"
                              : localCandidate.assignment.googleMeet.attendeeResponses?.every(
                                    (a) => a.responseStatus === "accepted"
                                  )
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-blue-500 hover:bg-blue-600"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            const meetingInfo = `Meeting: ${localCandidate.assignment.googleMeet.summary}
                                                  Description: ${localCandidate.assignment.googleMeet.description}
                                                  Time: ${localCandidate.assignment?.time ? `${formatDate(localCandidate.assignment.time)} at ${formatTime(localCandidate.assignment.time)}` : "Not set"}
                                                  Google Meet Link: ${localCandidate.assignment.googleMeet.meetingLink}`;
                            copyToClipboard(meetingInfo, "Meeting information");
                          }}
                        >
                          <Video size={12} className="text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-sm p-3 bg-white/95 dark:bg-black/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 shadow-xl rounded-lg"
                      >
                        <div className="space-y-2">
                          {/* Meeting Title */}
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                            {localCandidate.assignment.googleMeet.summary}
                          </div>

                          {/* Instructions */}
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-2 py-1 rounded">
                            <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                            Click to copy meeting details
                          </div>

                          {/* Meeting Link */}
                          <div className="text-xs">
                            <div className="text-gray-500 dark:text-gray-400 mb-1">
                              Meeting Link:
                            </div>
                            <div className="text-blue-600 dark:text-blue-400 break-all bg-blue-50/50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200/50 dark:border-blue-800/50">
                              {localCandidate.assignment.googleMeet.meetingLink}
                            </div>
                          </div>

                          {/* Attendee Responses */}
                          {localCandidate.assignment.googleMeet
                            .attendeeResponses &&
                            localCandidate.assignment.googleMeet
                              .attendeeResponses.length > 0 && (
                              <div className="text-xs">
                                <div className="text-gray-500 dark:text-gray-400 mb-1">
                                  Attendee Responses:
                                </div>
                                <div className="space-y-1">
                                  {localCandidate.assignment.googleMeet.attendeeResponses.map(
                                    (attendee, idx) => {
                                      return (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50/50 dark:bg-gray-800/50 rounded relative group"
                                        >
                                          <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                                            {attendee.name ||
                                              attendee.email.split("@")[0]}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {attendee.comment && (
                                              <div className="relative">
                                                <span className="text-blue-500 text-xs cursor-help">
                                                  <MessageCircle size={12} />
                                                </span>
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
                                                  {attendee.comment}
                                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                              </div>
                                            )}
                                            <span
                                              className={cn(
                                                "text-xs px-1.5 py-0.5 rounded font-medium",
                                                attendee.responseStatus ===
                                                  "accepted" &&
                                                  "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
                                                attendee.responseStatus ===
                                                  "declined" &&
                                                  "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
                                                attendee.responseStatus ===
                                                  "tentative" &&
                                                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
                                                attendee.responseStatus ===
                                                  "needsAction" &&
                                                  "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
                                              )}
                                            >
                                              {attendee.responseStatus ===
                                                "accepted" && "✓ Accepted"}
                                              {attendee.responseStatus ===
                                                "declined" && "✗ Declined"}
                                              {attendee.responseStatus ===
                                                "tentative" && "? Maybe"}
                                              {attendee.responseStatus ===
                                                "needsAction" && "⏳ Pending"}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Sync Button for Google Meet Responses */}
                {localCandidate.assignment?.googleMeet?.eventId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                            isSyncing
                              ? "bg-blue-200 dark:bg-blue-800 cursor-not-allowed"
                              : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                          )}
                          onClick={handleSyncAttendeeResponses}
                          disabled={isSyncing}
                        >
                          <RefreshCw
                            size={12}
                            className={cn(
                              "text-gray-600 dark:text-gray-400",
                              isSyncing && "animate-spin"
                            )}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">
                          {isSyncing ? "Syncing..." : "Sync attendee responses"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {localCandidate.assignment?.time && (
                <div className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                  {formatDate(localCandidate.assignment?.time)} •{" "}
                  {formatTime(localCandidate.assignment?.time)}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );

  return (
    <>
      {onDashboard ? (
        <div
          className={cn(
            "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 h-full hover:border-gray-300 dark:hover:border-gray-700 w-[420px] flex-shrink-0",
            className
          )}
          onClick={(e) => {
            // Check if click target is a button or inside a dropdown/interactive element
            const target = e.target as HTMLElement;
            if (
              target.closest("button") ||
              target.closest('[role="menuitem"]') ||
              target.closest("[data-radix-collection-item]") ||
              target.closest("[data-radix-popper-content]") ||
              target.closest("[data-state]") ||
              target.closest(
                ".cursor-pointer:not(.bg-white):not(.dark\\:bg-black)"
              ) ||
              target.closest("a") ||
              target.tagName === "BUTTON"
            ) {
              return; // Don't open details if clicking on interactive elements
            }

            // Always open details when clicking on card content
            onViewDetails(localCandidate);
          }}
        >
          {renderCardContent()}
        </div>
      ) : (
        <Draggable draggableId={localCandidate._id} index={index}>
          {(provided: DraggableProvided) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              className={cn(
                "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing relative overflow-visible hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-700",
                isPending && "opacity-50",
                className
              )}
              onClick={(e) => {
                // Only trigger on actual click, not on drag
                if (e.detail === 0) return; // Ignore programmatic clicks

                // Check if click target is a button or inside a dropdown/interactive element
                const target = e.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest('[role="menuitem"]') ||
                  target.closest("[data-radix-collection-item]") ||
                  target.closest("[data-radix-popper-content]") ||
                  target.closest("[data-state]") ||
                  target.closest(
                    ".cursor-pointer:not(.bg-white):not(.dark\\:bg-black)"
                  ) ||
                  target.closest("a") ||
                  target.tagName === "BUTTON"
                ) {
                  return; // Don't open details if clicking on interactive elements
                }

                // Always open details when clicking on card content
                onViewDetails(localCandidate);
              }}
            >
              {renderCardContent()}
            </div>
          )}
        </Draggable>
      )}

      {/* Edit Candidate Dialog */}
      {isEditing && (
        <EditCandidateDialog
          candidate={localCandidate}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onUpdate={() => refetch()}
          onSuccess={() => {
            setIsEditing(false);
            refetch();
          }}
        />
      )}

      {/* Assign Candidate Dialog */}
      {isAssigning && (
        <AssignCandidateDialog
          candidate={localCandidate}
          refetch={async () => refetch()}
          isOpen={isAssigning}
          onOpenChange={setIsAssigning}
          onUpdate={() => refetch()}
          setLocalCandidate={() => {}}
          onSuccess={() => {
            setIsAssigning(false);
            refetch();
          }}
        />
      )}

      {/* Add Follow Up Dialog */}
      {isAddingFollowUp && (
        <AddFollowUpDialog
          candidate={localCandidate}
          handleRemoveFollowUp={handleRemoveFollowUp}
          isOpen={isAddingFollowUp}
          onOpenChange={setIsAddingFollowUp}
          refetch={async () => refetch()}
          handleAddFollowUp={handleAddFollowUp}
          setNewFollowUp={setNewFollowUp}
          setNewFollowUpDate={setNewFollowUpDate}
          newFollowUp={newFollowUp}
          newFollowUpDate={newFollowUpDate}
          onAddingFollowup={async () => {
            setIsAddingFollowUp(false);
            setNewFollowUp("");
            setNewFollowUpDate(null);
            refetch();
          }}
          isLoading={isFollowUpSubmitting}
        />
      )}

      {/* Mark as Done Dialog */}
      <ConfirmAndRemarkDialog
        title="Mark as Done"
        message="Candidate will be Un-Assigned after marking as done."
        isOpen={confirmUnassignOpen}
        setIsOpen={setConfirmUnassignOpen}
        onConfirm={(note, rating) => {
          confirmUnassign(note, rating);
        }}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
      />

      {(isAddRemarkOpen || openRemarks) && (
        <AddRemarksDialog
          candidate={localCandidate}
          isOpen={openRemarks}
          onOpenChange={() => {
            setOpenRemarksFor(null);
            setIsAddRemarkOpen(false);
          }}
          setOpenRemarksFor={() => {}}
          refetch={async () => refetch()}
        />
      )}

      {/* Email Candidate Dialog */}
      {isEmailDialogOpen && (
        <EmailCandidateDialog
          isOpen={isEmailDialogOpen}
          onClose={() => setIsEmailDialogOpen(false)}
          candidate={{
            _id: localCandidate._id,
            name: localCandidate.name,
            email: localCandidate.email,
          }}
        />
      )}
    </>
  );
}
