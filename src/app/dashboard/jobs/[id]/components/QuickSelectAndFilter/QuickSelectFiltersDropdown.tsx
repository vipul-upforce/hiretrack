'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FilterState } from '../../types/filter.types.ts';

import {
  Filter,
  ChevronDown,
  Star,
  Calendar,
  Clock,
  MessageSquare,
  UserCheck,
  UserX,
  FileText,
  FileX,
  Target,
} from 'lucide-react';
import React from 'react';

interface QuickSelectFiltersDropdownProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onFilterToggle: (key: keyof FilterState) => void;
  onClearAll: () => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  activeFiltersCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickSelectFiltersDropdown({
  filters,
  setFilters,
  onFilterToggle,
  onClearAll,
  showArchived,
  onShowArchivedChange,
  activeFiltersCount,
  isOpen,
  onOpenChange,
}: QuickSelectFiltersDropdownProps) {
  const handleClearAndClose = () => {
    onClearAll();
    onOpenChange(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
          {showArchived && (
            <Badge variant="secondary" className="ml-1">
              Archived
            </Badge>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between text-sm">
            <span>Logical Operator:</span>
            <div className="flex items-center space-x-2">
              <Button
                variant={filters.logicalOperator === 'AND' ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, logicalOperator: 'AND' }))
                }
                className="h-6 px-2 text-xs"
              >
                AND
              </Button>
              <Button
                variant={filters.logicalOperator === 'OR' ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, logicalOperator: 'OR' }))
                }
                className="h-6 px-2 text-xs"
              >
                OR
              </Button>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.topCandidates}
          onCheckedChange={() => onFilterToggle('topCandidates')}
          onSelect={(e) => e.preventDefault()}
        >
          <Star className="h-4 w-4 mr-2" />
          Top Candidates (7+ score)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.appliedThisWeek}
          onCheckedChange={() => onFilterToggle('appliedThisWeek')}
          onSelect={(e) => e.preventDefault()}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Applied This Week
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.appliedToday}
          onCheckedChange={() => onFilterToggle('appliedToday')}
          onSelect={(e) => e.preventDefault()}
        >
          <Clock className="h-4 w-4 mr-2" />
          Applied Today
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.appliedIn15Days}
          onCheckedChange={() => onFilterToggle('appliedIn15Days')}
          onSelect={(e) => e.preventDefault()}
        >
          <Target className="h-4 w-4 mr-2" />
          Applied in 15 Days
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.toFollowUp}
          onCheckedChange={() => onFilterToggle('toFollowUp')}
          onSelect={(e) => e.preventDefault()}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          To Follow Up
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.assigned}
          onCheckedChange={() => onFilterToggle('assigned')}
          onSelect={(e) => e.preventDefault()}
        >
          <UserCheck className="h-4 w-4 mr-2" />
          Assigned
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.notAssigned}
          onCheckedChange={() => onFilterToggle('notAssigned')}
          onSelect={(e) => e.preventDefault()}
        >
          <UserX className="h-4 w-4 mr-2" />
          Not Assigned
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.withRemarks}
          onCheckedChange={() => onFilterToggle('withRemarks')}
          onSelect={(e) => e.preventDefault()}
        >
          <FileText className="h-4 w-4 mr-2" />
          With Remarks
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.withoutRemarks}
          onCheckedChange={() => onFilterToggle('withoutRemarks')}
          onSelect={(e) => e.preventDefault()}
        >
          <FileX className="h-4 w-4 mr-2" />
          Without Remarks
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showArchived}
          onCheckedChange={(checked) => onShowArchivedChange(checked)}
          onSelect={(e) => e.preventDefault()}
        >
          <FileText className="h-4 w-4 mr-2" />
          Show Archived
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleClearAndClose}>
          Clear All Filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
