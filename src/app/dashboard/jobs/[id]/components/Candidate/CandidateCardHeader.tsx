/**
 * Candidate Card Header Component
 * Displays candidate name, job title, status, tags, action buttons, and dropdown menu
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Flag,
  Plus,
  Eye,
  MoreVertical,
  Info,
  Edit,
  Mail,
  Download,
  UserPlus,
  Briefcase,
  Tag,
  CheckCircle,
  MessageSquare,
  ArchiveRestore,
  Trash2,
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
import { Candidate } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import TagsList from "@/components/ui/tagsList";
import RemarksPopover from "../Remarks/remarks-popover";
import { formatDistanceToNow } from "date-fns";
import { getTrackingDate } from "../../utils/candidateAccessors";

// Extend the CandidateCardHeaderProps if jobTitle or status is not already on candidate
interface CandidateCardHeaderProps {
  candidate: Candidate;
  user: User | null;
  showStar: boolean;
  showRedFlag: boolean;
  onViewDetails: (candidate: Candidate) => void;
  setOpenRemarksFor: (id: string | null) => void;
  setIsAddRemarkOpen: (open: boolean) => void;
  setIsEditing: (open: boolean) => void;
  setIsEmailDialogOpen: (open: boolean) => void;
  setIsShareDialogOpen: (open: boolean) => void;
  setIsAssigning: (open: boolean) => void;
  setIsTagsOpen: (open: boolean) => void;
  setConfirmUnassignOpen: (open: boolean) => void;
  setIsAddingFollowUp: (open: boolean) => void;
  onDashboard: boolean;
  onDeleteClick?: (candidateId: string) => void;
  handleAssignJob: (candidate: Candidate, e: React.MouseEvent) => void;
  handlePopoverContentClick: (e: React.MouseEvent) => void;
}

export function CandidateCardHeader({
  candidate,
  user,
  showStar,
  showRedFlag,
  onViewDetails,
  setOpenRemarksFor,
  setIsAddRemarkOpen,
  setIsEditing,
  setIsEmailDialogOpen,
  setIsShareDialogOpen,
  setIsAssigning,
  setIsTagsOpen,
  setConfirmUnassignOpen,
  setIsAddingFollowUp,
  onDashboard,
  onDeleteClick,
  handleAssignJob,
  handlePopoverContentClick,
}: CandidateCardHeaderProps) {
  const createdAt = getTrackingDate(candidate, "createdAt");
  const updatedAt = getTrackingDate(candidate, "updatedAt");

  // Guess field names for job and status
  // If not present on Candidate, you'll need to adjust as per your model
  const jobTitle: string =
    candidate.jobId?.title ||
    candidate.jobDetails?.title ||
    "-";
  const status: string =
    (candidate.status as string) ||
    (candidate ).currentStatus ||
    (candidate ).state ||
    "-";

  const formatSmartDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    const now = Date.now();
    const gap = now - date.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (gap < thirtyDays) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
      {/* Header row with job title and status */}
      
      
      {/* Main row with name, tags, actions */}
      <div className="flex justify-between items-center pb-2 mt-1">
        <div className="flex flex-col justify-center items-center pr-3 h-full" style={{
    height: "-webkit-fill-available"}}>
          <div className="flex flex-col h-full">
          
            <div className="flex items-center gap-2 h-full">
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
              {showRedFlag && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Low-scoring candidate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight truncate max-w-[150px]">
                {candidate.name}
              </h3>
            </div>
          </div>
          {candidate.tags && <TagsList candidate={candidate} />}
        </div>

        <div className="flex-col flex justify-center items-center">
        {/* <div className="flex-shrink-0 ml-2"> */}
         {/* {onDashboard && <Badge variant="outline" className="text-xs px-2 py-0.5 capitalize min-w-[72px] mb-2" data-testid="candidate-status">
            {status}
          </Badge>} */}
          {onDashboard && <div className="text-xs absolute top-[-16px] right-[-16px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-tr-md rounded-bl-md rounded-tl-none rounded-br-none">
            <p className="font-bold text-xs capitalize">
            {status}
            </p>
          </div>}
        {/* </div> */}
        <div className="flex gap-1.5 mt-[1px] flex-shrink-0">
          {/* Add Remarks Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 !py-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              setOpenRemarksFor(candidate._id);
              setIsAddRemarkOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Remark Popover */}
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
              {/* View Details */}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(candidate);
                }}
              >
                <Info className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>

              {/* Edit */}
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

              {/* Email */}
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

              {/* Download Profile */}
              {(user?.role === "admin" || user?.role === "hr") && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShareDialogOpen(true);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Profile
                </DropdownMenuItem>
              )}

              {/* Assign To */}
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

              {/* Assign Job */}
              <DropdownMenuItem onClick={(e) => handleAssignJob(candidate, e)}>
                <Briefcase className="mr-2 h-4 w-4" />
                {!candidate.jobId ? "Assign Job" : "Switch Job"}
              </DropdownMenuItem>

              {/* Tags */}
              {user?.role !== "interviewer" && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTagsOpen(true);
                    handlePopoverContentClick(e);
                  }}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </DropdownMenuItem>
              )}

              {/* Mark as Done */}
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

              {/* Add/Edit Follow Up */}
              {user?.role !== "interviewer" && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingFollowUp(true);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {candidate?.followUp?.note || candidate?.followUp?.date
                    ? "Edit Follow Up"
                    : "Add Follow Up"}
                </DropdownMenuItem>
              )}

              {/* Add Remark */}
              {user?.role !== "candidate" && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenRemarksFor(candidate._id);
                    setIsAddRemarkOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Remark
                </DropdownMenuItem>
              )}

              {/* Separator before delete */}
              {!onDashboard && <DropdownMenuSeparator />}

              {/* Delete/Archive */}
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
      </div>
      {/* Dates row */}
      <div className="flex justify-between items-center">
        <div className="text-[11px] text-gray-500 capitalize justify-between">
          <p className="leading-tight truncate">
            Applied: {createdAt ? formatSmartDate(createdAt) : "N/A"}
          </p>
        </div>
        <div className="text-[11px] text-gray-500 capitalize leading-tight truncate flex justify-end">
          <p className="leading-tight truncate">
            Last Updated: {updatedAt ? formatSmartDate(updatedAt) : "N/A"}
          </p>
        </div>
      </div>
      {onDashboard && <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-xs text-gray-700 dark:text-gray-300 leading-snug truncate max-w-full"
            title={jobTitle}
            data-testid="job-title"
          >
            {jobTitle}
          </p>
        </div>}
    </div>
  );

}