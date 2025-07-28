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
import AddRemarksPopover from "../Dialogs/add-remark-dialog";
import RemarksPopover from "../Remarks/remarks-popover";
import { CandidateScoreBadge } from "../Utils/candidate-score-badge";
import FollowupDisplay from "../Remarks/followup-popover";
import { useRemarkHandlers } from "../../hooks/useRemarkHandlers";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { User } from "@/lib/features/users/usersApi";
import TagsList from "@/components/ui/tagsList";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import CustomFieldBadge from "./CustomFieldBadge";
import { CalendarClockIcon } from "lucide-react";
import { Trash2Icon } from "lucide-react";
import { MapPin, Clock, DollarSign, Star } from "lucide-react";
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
}: CandidateCardProps) {
  const { formNameObject } = useCustomForm("Candidate");
  const [user, setUser] = useState<User | null>(null);
  const [removeFUOpen, setRemoveFUOpenLocal] = useState(false);
  const { handleRemoveFollowUp } = useRemarkHandlers(candidate, user, refetch);

  // State for menu actions
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [confirmUnassignOpen, setConfirmUnassignOpen] = useState(false);

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
    undefined,
    undefined,
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

  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      if (token) {
        const decryptedResponse = await verifyAndDecryptJWTToken(String(token));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUser(decryptedResponse.user);
        }
      }
    })();
  }, []);

  const renderCardContent = () => (
    <div className="flex flex-col h-full relative">
      {/* Main content area - will expand to fill available space */}
      <div className="flex-1 flex flex-col">
        {/* Header with name and buttons */}
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex-1 pr-3">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 leading-tight flex items-center gap-2 mb-2">
              {showStar && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              {candidate.name}
            </h3>
            {candidate.tags && <TagsList candidate={candidate} />}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {/* Add Remarks Popover */}
            <AddRemarksPopover
              candidate={candidate}
              isOpen={openRemarks}
              refetch={refetch}
              setOpenRemarksFor={setOpenRemarksFor}
              onOpenChange={(open) =>
                setOpenRemarksFor(open ? candidate._id : null)
              }
            />

            {/* Remarks Popover */}
            <RemarksPopover
              candidate={candidate}
              onMoreClick={() => onViewDetails(candidate)}
            />

            {/* View Details Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
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
                  className="h-8 w-8 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700"
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRemarksFor(candidate._id);
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

        {/* Experience, Location, CTC */}
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 min-w-2"></div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Experience:
            </span>
            <span className="font-semibold text-green-700 dark:text-green-400">
              {candidate.experience} years
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 min-w-2"></div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Location:
            </span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {candidate.location}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 min-w-2"></div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              CTC:
            </span>
            <span className="font-semibold text-purple-700 dark:text-purple-400">
              {candidate.expectedCTC} LPA
            </span>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 min-w-2"></div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Skills:
            </span>
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 3).map((skill, index) => (
                <Badge
                  key={`${candidate._id}-skill-${index}-${skill}`}
                  variant="secondary"
                  className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                >
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 3 && (
                <Badge
                  key="more-skills"
                  variant="secondary"
                  className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                >
                  +{candidate.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Scores */}
        {candidate.scores && candidate.scores.overall !== undefined && (
          <div className="flex gap-1 py-1 flex-wrap justify-start mb-2">
            {candidate.scores.overall >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.overall}
                category="Overall"
              />
            )}
            {candidate.scores.experience >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.experience}
                category="Exp"
              />
            )}
            {candidate.scores.skills >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.skills}
                category="Skills"
              />
            )}
            {candidate.scores.affordability >= 0 && (
              <CandidateScoreBadge
                score={candidate.scores.affordability}
                category="Affordability"
              />
            )}
          </div>
        )}

        {/* Custom fields */}
        {candidate.customFields &&
          Object.entries(candidate.customFields).filter(([key, value]) => {
            const field = formNameObject?.fields.find((f) => f.label === key);
            if (field?.candidateId && field.candidateId !== candidate._id)
              return false;
            return field?.showOnCard;
          }).length > 0 && (
            <div className="mb-3 space-y-2">
              {Object.entries(candidate.customFields)
                .filter(([key, value]) => {
                  const field = formNameObject?.fields.find(
                    (f) => f.label === key
                  );
                  if (field?.candidateId && field.candidateId !== candidate._id)
                    return false;
                  return field?.showOnCard;
                })
                .map(([key, value], i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 min-w-2"></div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
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
        <div className="mt-auto mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                {candidate.followUp.date && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                    {formatDate(candidate.followUp.date)} at{" "}
                    {formatTime(candidate.followUp.date)}
                  </div>
                )}
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  {candidate.followUp.note as string}
                </p>
              </div>
            </div>
            {user?.role !== "candidate" && user?.role !== "interviewer" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingFollowUp(true);
                  }}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 flex-shrink-0"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRemoveFUOpenLocal(true);
                  }}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 flex-shrink-0"
                >
                  <Trash2Icon size={14} />
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

      {/* Interview details footer - Always at bottom */}
      {candidate.assignment &&
        candidate.assignment.interviewerId &&
        typeof candidate.assignment.interviewerId === "object" &&
        candidate.assignment.interviewerId._id &&
        candidate.assignment.interviewerId.name && (
          <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 -mx-3 -mb-3 px-3 py-2 mt-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <CalendarClockIcon
                  size={14}
                  className="text-gray-500 dark:text-gray-400"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {candidate.assignment.interviewerId.name}
                </span>
              </div>
              {candidate.assignment?.time && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {candidate.assignment?.time &&
                    formatDate(candidate.assignment?.time)}{" "}
                  at{" "}
                  {candidate.assignment?.time &&
                    formatTime(candidate.assignment?.time)}
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
            "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border border-gray-200 dark:border-gray-700 p-4 shadow-sm cursor-pointer hover:shadow-lg transition-all duration-200 h-full hover:border-blue-200 dark:hover:border-blue-700 hover:scale-[1.02]",
            className
          )}
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
                "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border border-gray-200 dark:border-gray-700 p-4 shadow-sm cursor-grab active:cursor-grabbing relative overflow-visible hover:shadow-lg transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-700 hover:scale-[1.02]",
                className
              )}
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
          confirmUnassign(note, rating);
        }}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
      />
    </>
  );
}
