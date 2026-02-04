'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  X,
  UserPlus,
  Briefcase,
  CheckCircle,
  Trash2,
  ArchiveRestore,
  MoreHorizontal,
  StickyNote,
  MessageSquare,
  ArrowRightLeft,
} from 'lucide-react';
import type { CandidateActionType } from '@/components/unified-candidate-dialog/types';

interface BulkActionsDropdownProps {
  selectedCount: number;
  showArchived: boolean;
  isArchiving: boolean;
  onClearSelection: () => void;
  onOpenDialog: (action: CandidateActionType) => void;
  onArchiveClick: (action: 'archive' | 'unarchive') => void;
}

export function BulkActionsDropdown({
  selectedCount,
  showArchived,
  isArchiving,
  onClearSelection,
  onOpenDialog,
  onArchiveClick,
}: BulkActionsDropdownProps) {
  return (
    <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-3">
      <Badge variant="secondary" className="text-sm font-normal">
        {selectedCount} selected
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-7 w-7 p-0 rounded-full"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4" />
            Bulk actions
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Choose an action for selected candidates
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenDialog('assignTo')} className="cursor-pointer">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign To
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog('switchJob')} className="cursor-pointer">
            <Briefcase className="h-4 w-4 mr-2" />
            Move to Job
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog('markAsDone')} className="cursor-pointer">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Done
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onOpenDialog('addRemark')} className="cursor-pointer">
            <StickyNote className="h-4 w-4 mr-2" />
            Add Remark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog('addFollowUp')} className="cursor-pointer">
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Follow-up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog('updateStatus')} className="cursor-pointer">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Update Status
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onArchiveClick(showArchived ? 'unarchive' : 'archive')}
            disabled={isArchiving}
            className={`cursor-pointer ${!showArchived ? 'text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400' : 'text-blue-600 focus:text-blue-600 dark:text-blue-400 dark:focus:text-blue-400'}`}
          >
            {showArchived ? (
              <><ArchiveRestore className="h-4 w-4 mr-2" />Restore</>
            ) : (
              <><Trash2 className="h-4 w-4 mr-2" />Archive</>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
