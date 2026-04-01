'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArchiveRestore,
  CheckCircle,
  ClipboardCheck,
  Download,
  Edit,
  FileDown,
  MessageSquare,
  MoreVertical,
  Plus,
  Trash2,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { CandidateActionType } from '@/components/unified-candidate-dialog/types';

interface CandidateDetailsActionsMenuProps {
  candidate: Candidate;
  isAdminOrHr: boolean;
  onOpenUnifiedAction?: (action: CandidateActionType) => void;
  onEditClick?: () => void;
  onArchiveClick?: (candidateId: string) => void;
  onDownloadProfile: () => void;
  onDownloadCV: () => void;
}

export function CandidateDetailsActionsMenu({
  candidate,
  isAdminOrHr,
  onOpenUnifiedAction,
  onEditClick,
  onArchiveClick,
  onDownloadProfile,
  onDownloadCV,
}: CandidateDetailsActionsMenuProps) {
  if (!isAdminOrHr) return null;

  const canEdit = !candidate.isDeleted && !!onEditClick;
  const canAssign = !candidate.isDeleted && !!onOpenUnifiedAction;
  const canSwitchJob = !candidate.isDeleted && !!onOpenUnifiedAction;
  const canMarkAsDone =
    !candidate.isDeleted && !!candidate.assignment && !!onOpenUnifiedAction;
  const canAddFollowUp = !!onOpenUnifiedAction;
  const canAddRemark = !!onOpenUnifiedAction;
  const canUpdateStatus = !candidate.isDeleted && !!onOpenUnifiedAction;
  const canArchive = !!onArchiveClick;

  const hasMenuItems =
    !!candidate.resume?.url ||
    isAdminOrHr ||
    canEdit ||
    canAssign ||
    canSwitchJob ||
    canMarkAsDone ||
    canAddFollowUp ||
    canAddRemark ||
    canUpdateStatus ||
    canArchive;

  if (!hasMenuItems) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Candidate actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {candidate.resume?.url && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDownloadCV();
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CV
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDownloadProfile();
          }}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Download Profile
        </DropdownMenuItem>

        {(canUpdateStatus ||
          canAssign ||
          canSwitchJob ||
          canMarkAsDone ||
          canAddFollowUp ||
          canAddRemark ||
          canEdit ||
          canArchive) && <DropdownMenuSeparator />}

        {canUpdateStatus && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnifiedAction?.('updateStatus');
            }}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Update Status
          </DropdownMenuItem>
        )}

        {canAssign && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnifiedAction?.('assignTo');
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Assign To
          </DropdownMenuItem>
        )}

        {canSwitchJob && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnifiedAction?.('switchJob');
            }}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Switch Job
          </DropdownMenuItem>
        )}

        {canMarkAsDone && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnifiedAction?.('markAsDone');
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Done
          </DropdownMenuItem>
        )}

        {canAddFollowUp && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnifiedAction?.('addFollowUp');
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Add Follow Up
          </DropdownMenuItem>
        )}

        {canAddRemark && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenUnifiedAction?.('addRemark');
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Remark
          </DropdownMenuItem>
        )}

        {canEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEditClick?.();
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}

        {canArchive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onArchiveClick?.(candidate._id);
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
              {candidate.isDeleted ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
