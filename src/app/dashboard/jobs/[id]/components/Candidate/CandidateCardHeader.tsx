/* eslint-disable max-lines */
import { Button } from '@/components/ui/button';
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
  TriangleAlert,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from 'react';
import { Candidate } from '@/types/candidate';
import { User } from '@/lib/features/users/usersApi';
import TagsList from '@/components/ui/tagsList';
import { formatDistanceToNow } from 'date-fns';
import RemarksPopover from '../Remarks/remarks-popover';
import { getTrackingDate } from '../../utils/candidateAccessors';

// Extend the CandidateCardHeaderProps if jobTitle or status is not already on candidate
interface CandidateCardHeaderProps {
  candidate: Candidate;
  setLocalCandidate: React.Dispatch<React.SetStateAction<Candidate>>;
  user: User | null;
  showStar: boolean;
  showRedFlag: boolean;
  onViewDetails: (candidate?: Candidate) => void;
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
  onOpenThisCandidateDuplicateDialog: () => void;
  /** From KanbanColumn: shift-click range selection */
  onSelectCandidate?: (candidate: Candidate, candidateIndex: number) => void;
  candidateIndex?: number;
  isShiftPressed?: boolean;
}

export function CandidateCardHeader({
  candidate,
  setLocalCandidate: _setLocalCandidate,
  user,
  showStar,
  showRedFlag,
  onViewDetails,
  setOpenRemarksFor: _setOpenRemarksFor,
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
  onOpenThisCandidateDuplicateDialog,
  onSelectCandidate: _onSelectCandidate,
  candidateIndex: _candidateIndex = 0,
  isShiftPressed: _isShiftPressed = false,
}: CandidateCardHeaderProps) {
  const createdAt = getTrackingDate(candidate, 'createdAt');
  const updatedAt = getTrackingDate(candidate, 'updatedAt');

  const jobTitle: string =
    candidate.jobId?.title || candidate.jobDetails?.title || '-';
  const status: string = candidate.status as string;

  const formatSmartDate = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    const now = Date.now();
    const gap = now - date.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (gap < thirtyDays) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return date.toLocaleDateString();
  };


  return (
    <div className="mb-2 border-b border-gray-100 pb-2 dark:border-gray-800 group">
      {/* Header row with job title and status */}
      {/* Main row with name, tags, actions */}
      <div className="mt-1 flex items-center justify-between pb-2">
        <div className="flex items-center justify-start">
          <div
            className="flex h-full flex-col items-center justify-center pr-3"
            style={{ height: '-webkit-fill-available' }}
          >
            <div className="flex h-full flex-col">
              <div className="flex h-full items-center gap-2">
                {showStar && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
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
                        <Flag className="h-4 w-4 fill-red-500 text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Low-scoring candidate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <h3 className="max-w-[150px] truncate text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">
                  {candidate.name}
                </h3>
                {(user?.role === 'admin' || user?.role === 'hr') && (candidate?.duplicateCount as number) > 1 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-yellow-500 hover:bg-gray-100 hover:text-yellow-600 dark:hover:bg-gray-800 dark:hover:text-yellow-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenThisCandidateDuplicateDialog();
                          }}
                        >
                          <TriangleAlert className="h-4 w-4" />
                          <span className="sr-only">Multiple Applications</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Multiple Applications
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            {candidate.tags && <TagsList candidate={candidate} />}
          </div>

        </div>

        <div className="flex flex-col items-center justify-center">
          {onDashboard && (
            <div className="absolute right-[-16px] top-[-16px] rounded-bl-md rounded-br-none rounded-tl-none rounded-tr-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <p className="text-xs font-bold capitalize">{status}</p>
            </div>
          )}
          {/* </div> */}
          <div className="mt-[1px] flex flex-shrink-0 gap-1.5">

            {/* Add Remarks Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 !py-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
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
              className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                  className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
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
                  <Info className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>

                {/* Edit */}
                {user?.role !== 'candidate' && !candidate.isDeleted && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {/* Email */}
                {user?.role !== 'candidate' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEmailDialogOpen(true);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </DropdownMenuItem>
                )}

                {/* Download Profile */}
                {(user?.role === 'admin' || user?.role === 'hr') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsShareDialogOpen(true);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Profile
                  </DropdownMenuItem>
                )}

                {/* Assign To */}
                {user?.role !== 'interviewer' && !candidate.isDeleted && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAssigning(true);
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign To
                  </DropdownMenuItem>
                )}

                {/* Assign Job */}
                <DropdownMenuItem
                  onClick={(e) => handleAssignJob(candidate, e)}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  {!candidate.jobId ? 'Assign Job' : 'Switch Job'}
                </DropdownMenuItem>

                {/* Tags */}
                {user?.role !== 'interviewer' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTagsOpen(true);
                      handlePopoverContentClick(e);
                    }}
                  >
                    <Tag className="mr-2 h-4 w-4" />
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
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Done
                  </DropdownMenuItem>
                )}

                {/* Add/Edit Follow Up */}
                {user?.role !== 'interviewer' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingFollowUp(true);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {candidate?.followUp?.note || candidate?.followUp?.date
                      ? 'Edit Follow Up'
                      : 'Add Follow Up'}
                  </DropdownMenuItem>
                )}

                {/* Add Remark */}
                {user?.role !== 'candidate' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddRemarkOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
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
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {candidate.isDeleted ? (
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {candidate.isDeleted ? 'Restore' : 'Delete'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {/* Dates row */}
      <div className="flex items-center justify-between">
        <div className="justify-between text-[11px] capitalize text-gray-500">
          <p className="truncate leading-tight">
            Applied: {createdAt ? formatSmartDate(createdAt) : 'N/A'}
          </p>
        </div>
        <div className="flex justify-end truncate text-[11px] capitalize leading-tight text-gray-500">
          <p className="truncate leading-tight">
            Last Updated: {updatedAt ? formatSmartDate(updatedAt) : 'N/A'}
          </p>
        </div>
      </div>
      {onDashboard && (
        <div className="min-w-0 flex-1">
          <p
            className="max-w-full truncate text-xs font-semibold leading-snug text-gray-700 dark:text-gray-300"
            title={jobTitle}
            data-testid="job-title"
          >
            {jobTitle}
          </p>
        </div>
      )}
    </div>
  );
}
