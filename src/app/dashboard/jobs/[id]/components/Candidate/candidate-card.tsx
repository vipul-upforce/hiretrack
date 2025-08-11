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
} from "lucide-react";
import { Candidate } from "@/types/candidate";
import { formatDate, formatTime } from "../../hooks/dateTimeFormatting";
import RemarksPopover from "../Remarks/remarks-popover";
import { CandidateScoreBadge } from "../Utils/candidate-score-badge";
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
  // State for menu actions
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

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
  } = useRemarkHandlers(
    candidate,
    user,
    async () => refetch(),
    undefined,
    undefined,
    undefined
  );

  const { isLoading, handleUnassign, confirmUnassign } = useUnassignHandlers(
    candidate,

    user,
    async () => refetch(),
    () => {},
    () => {},
    undefined,
    undefined
  );

  // Calculate average score across all categories
  const calculateAverageScore = () => {
    if (!candidate.scores) return 0;

    const scores = [
      candidate.scores.overall,
      candidate.scores.experience,
      candidate.scores.skills,
      candidate.scores.affordability,
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
      setNewFollowUp(candidate?.followUp?.note || "");
      if (candidate?.followUp?.date) {
        setNewFollowUpDate(dayjs(candidate.followUp.date));
      } else {
        setNewFollowUpDate(null);
      }
    }
  }, [isAddingFollowUp, candidate]);

  // useEffect(() => {
  //   (async () => {
  //     const token = Cookies.get("token");
  //     if (token) {
  //       const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
  //       if (decryptedResponse.success && decryptedResponse.user) {
  //         setUser(decryptedResponse.user);
  //       }
  //     }
  //   })();
  // }, []);

  const renderCardContent = () => (
    <div className="flex flex-col h-full relative">
      {/* Main content area - will expand to fill available space */}
      <div className="flex-1 flex flex-col">
        {/* Header with name and buttons */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
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
                {candidate.name}
              </h3>
            </div>
            {candidate.tags && <TagsList candidate={candidate} />}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {/* Add Remarks Button - handled by main page ChecklistRemarksDialog */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                setOpenRemarksFor(candidate._id);
                // onAddRemarkClick(candidate);
                setIsAddRemarkOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Remarks Popover */}
            <RemarksPopover
              candidate={candidate}
              onMoreClick={() => onViewDetails(candidate)}
            />

            {/* View Details Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(candidate);
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
                    onViewDetails(candidate);
                  }}
                >
                  <Info className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>

                {/* Edit - Only for non-candidate roles and when not deleted */}
                {user?.role !== "candidate" && !candidate.isDeleted && (
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
                {user?.role !== "interviewer" && !candidate.isDeleted && (
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
                {candidate.assignment && !candidate.isDeleted && (
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
                    {candidate.followUp ? "Edit Follow Up" : "Add Follow Up"}
                  </DropdownMenuItem>
                )}

                {/* Add Remark - Only for non-candidate roles */}
                {user?.role !== "candidate" && (
                  <DropdownMenuItem
                    // onClick={(e) => {
                    //   e.stopPropagation();
                    //   setOpenRemarksFor(candidate._id);
                    //   onAddRemarkClick(candidate);
                    // }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRemarksFor(candidate._id);
                      // onAddRemarkClick(candidate);
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
                      onDeleteClick?.(candidate._id);
                    }}
                    className={
                      candidate.isDeleted
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {candidate.isDeleted ? (
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {candidate.isDeleted ? "Restore" : "Delete"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                Experience
              </span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold truncate">
                {candidate.experience} years
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
                {candidate.location}
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
                {candidate.expectedCTC} LPA
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
                {candidate.noticePeriod
                  ? `${candidate.noticePeriod} days`
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
                {candidate.currentCTC ? `${candidate.currentCTC} LPA` : "-"}
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
                  {candidate.contact || "N/A"}
                </span>
                {candidate.contact && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(candidate.contact, "Contact number");
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {candidate.email && (
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 min-w-0">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide truncate">
                  Email
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-900 dark:text-gray-100 font-semibold truncate flex-1 min-w-0">
                    {candidate.email}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(candidate.email, "Email");
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
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mb-5">
            <div className="mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-medium truncate">
                Skills
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.slice(0, 4).map((skill, index) => (
                <Badge
                  key={`${candidate._id}-skill-${index}-${skill}`}
                  variant="secondary"
                  className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 font-medium truncate max-w-full"
                  title={skill}
                >
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 4 && (
                <Badge
                  key="more-skills"
                  variant="secondary"
                  className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 font-medium flex-shrink-0"
                >
                  +{candidate.skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Scores */}
        {candidate.scores && candidate.scores.overall !== undefined && (
          <div className="mb-5">
            <div className="mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-medium truncate">
                Evaluation Scores
              </span>
            </div>
            <div className="flex gap-2 flex-wrap justify-start">
              {candidate.scores.overall >= 0 && (
                <div className="truncate">
                  <CandidateScoreBadge
                    score={candidate.scores.overall}
                    category="Overall"
                  />
                </div>
              )}
              {candidate.scores.experience >= 0 && (
                <div className="truncate">
                  <CandidateScoreBadge
                    score={candidate.scores.experience}
                    category="Exp"
                  />
                </div>
              )}
              {candidate.scores.skills >= 0 && (
                <div className="truncate">
                  <CandidateScoreBadge
                    score={candidate.scores.skills}
                    category="Skills"
                  />
                </div>
              )}
              {candidate.scores.affordability >= 0 && (
                <div className="truncate">
                  <CandidateScoreBadge
                    score={candidate.scores.affordability}
                    category="Affordability"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom fields */}
        {candidate.customFields &&
          Object.entries(candidate.customFields).filter(([key, value]) => {
            const field = formNameObject?.fields.find((f) => f.label === key);
            if (field?.candidateId && field.candidateId !== candidate._id)
              return false;
            return (
              field?.showOnCard &&
              value != null &&
              value !== "" &&
              (!Array.isArray(value) || value.length > 0)
            );
            // return field?.showOnCard;
          }).length > 0 && (
            <div className="mb-3 space-y-2">
              {Object.entries(candidate.customFields)
                .filter(([key, value]) => {
                  const field = formNameObject?.fields.find(
                    (f) => f.label === key
                  );
                  if (field?.candidateId && field.candidateId !== candidate._id)
                    return false;
                  return (
                    field?.showOnCard &&
                    value != null &&
                    value !== "" &&
                    (!Array.isArray(value) || value.length > 0)
                  );
                  // return field?.showOnCard;
                })
                .map(([key, value], i) => (
                  <div key={i} className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {key.split(" |||||(")[0]}:
                    </span>
                    {/* <span className="font-semibold text-orange-700 dark:text-orange-400">
                      {String(value)}
                    </span> */}
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

      {/* Follow-up Section - Always at bottom */}
      {candidate.followUp && candidate.followUp.note && (
        <div className="mt-auto mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border-l-4 border-amber-400 dark:border-amber-500">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {candidate.followUp.date && (
                  <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                    {formatDate(candidate.followUp.date)} at{" "}
                    {formatTime(candidate.followUp.date)}
                  </div>
                )}
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-tight line-clamp-2 break-words">
                  {candidate.followUp.note as string}
                </p>
                {candidate.followUp.userId && (
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Created by:{" "}
                    <span className="font-bold">
                      {/* {candidate.followUp.userId.name ? candidate.followUp.userId.name : (candidate.followUp.userId as string)} */}
                      {candidate.followUp.userId.name}
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
      {candidate.assignment &&
        candidate.assignment.interviewerId &&
        typeof candidate.assignment.interviewerId === "object" &&
        candidate.assignment.interviewerId._id &&
        candidate.assignment.interviewerId.name && (
          <div
            className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/70 -mx-4 -mb-4 px-4 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
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
                    {candidate.assignment.interviewerId.name}
                  </span>
                  {candidate.assignment?.googleMeet && (
                    <Badge
                      variant="default"
                      className="ml-2 text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                    >
                      <Video size={10} className="mr-1" />
                      Google Meet
                    </Badge>
                  )}
                </span>
                {candidate.assignment?.googleMeet && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            const meetingInfo = `Meeting: ${candidate.assignment.googleMeet.summary}
Description: ${candidate.assignment.googleMeet.description}
Time: ${candidate.assignment?.time ? `${formatDate(candidate.assignment.time)} at ${formatTime(candidate.assignment.time)}` : "Not set"}
Google Meet Link: ${candidate.assignment.googleMeet.meetingLink}`;
                            copyToClipboard(meetingInfo, "Meeting information");
                          }}
                        >
                          <Video size={12} className="text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <div className="text-xs space-y-1">
                          <div className="font-semibold">
                            {candidate.assignment.googleMeet.summary}
                          </div>
                          <div className="text-gray-600">
                            Click to copy meeting details
                          </div>
                          <div className="text-blue-500 break-all">
                            {candidate.assignment.googleMeet.meetingLink}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {candidate.assignment?.time && (
                <div className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">
                  {formatDate(candidate.assignment?.time)} •{" "}
                  {formatTime(candidate.assignment?.time)}
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
            "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 h-full hover:border-gray-300 dark:hover:border-gray-700",
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
            onViewDetails(candidate);
          }}
        >
          {renderCardContent()}
        </div>
      ) : (
        <Draggable draggableId={candidate._id} index={index}>
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
                onViewDetails(candidate);
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
          candidate={candidate}
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
          candidate={candidate}
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
          candidate={candidate}
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
        />
      )}

      {/* Mark as Done Dialog */}
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
      />

      {
        <AddRemarksDialog
          candidate={candidate}
          isOpen={openRemarks}
          onOpenChange={() => {
            setOpenRemarksFor(null);
            setIsAddRemarkOpen(false);
          }}
          // onOpenChange={setIsAddRemarkOpen}
          setOpenRemarksFor={() => {}}
          refetch={async () => refetch()}
        />
      }

      {/* Email Candidate Dialog */}
      {isEmailDialogOpen && (
        <EmailCandidateDialog
          isOpen={isEmailDialogOpen}
          onClose={() => setIsEmailDialogOpen(false)}
          candidate={{
            _id: candidate._id,
            name: candidate.name,
            email: candidate.email,
          }}
        />
      )}
    </>
  );
}
