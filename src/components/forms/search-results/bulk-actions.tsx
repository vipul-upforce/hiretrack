'use client';

import { Button } from '@/components/ui/button';
import { MoreVertical, Briefcase, Archive, ArchiveRestore } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { memo } from 'react';

interface BulkActionsProps {
  selectedCount: number;
  onAssignJob: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}

export const BulkActions = memo(
  ({
    selectedCount,
    onAssignJob,
    onArchive,
    onUnarchive,
  }: BulkActionsProps) => {
    if (selectedCount === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="primary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAssignJob}>
            <Briefcase className="mr-2 h-4 w-4" />
            Assign Job
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUnarchive}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Unarchive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

BulkActions.displayName = 'BulkActions';
