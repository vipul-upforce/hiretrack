'use client';

import type React from 'react';

import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  User,
  Mail,
  Phone,
  Target,
  MapPin,
  Briefcase,
  Star,
  Calendar,
  Clock,
  Archive,
} from 'lucide-react';
import { memo } from 'react';

interface TableHeaderRowProps {
  visibleColumns: Record<string, boolean>;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  selectAll: boolean;
  onSelectAll: (checked: boolean | 'indeterminate') => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  name: <User className="h-4 w-4 text-muted-foreground" />,
  email: <Mail className="h-4 w-4 text-muted-foreground" />,
  contact: <Phone className="h-4 w-4 text-muted-foreground" />,
  skills: <Target className="h-4 w-4 text-muted-foreground" />,
  location: <MapPin className="h-4 w-4 text-muted-foreground" />,
  jobAssignment: <Briefcase className="h-4 w-4 text-muted-foreground" />,
  overallScore: <Star className="h-4 w-4 text-muted-foreground" />,
  createdAt: <Calendar className="h-4 w-4 text-muted-foreground" />,
  experience: <Clock className="h-4 w-4 text-muted-foreground" />,
  archived: <Archive className="h-4 w-4 text-muted-foreground" />,
};

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  contact: 'Contact',
  skills: 'Skills',
  location: 'Location',
  jobAssignment: 'Job Assignment',
  overallScore: 'Overall Score',
  expectedCTC: 'ECTC',
  currentCTC: 'CCTC',
  experience: 'Exp',
  createdAt: 'Applied',
  archived: 'Deleted',
};

const SORTABLE_COLUMNS = new Set([
  'name',
  'email',
  'contact',
  'location',
  'jobAssignment',
  'overallScore',
  'expectedCTC',
  'currentCTC',
  'experience',
  'createdAt',
  'isDeleted',
]);

function getSortIcon(
  field: string,
  sortField: string | null,
  sortDirection: 'asc' | 'desc',
) {
  if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
  return sortDirection === 'asc' ? (
    <ArrowUp className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-2 h-4 w-4" />
  );
}

export const TableHeaderRow = memo(({
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  selectAll,
  onSelectAll,
}: TableHeaderRowProps) => (
  <TableHeader>
    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
      {visibleColumns.select && (
      <TableHead className="w-[40px]">
        <Checkbox
          checked={selectAll}
          onCheckedChange={onSelectAll}
          aria-label="Select all candidates"
        />
      </TableHead>
      )}
      {Object.entries(visibleColumns).map(([column, isVisible]) => {
        if (column === 'select' || column === 'actions' || !isVisible) {
          return null;
        }

        const isSortable = SORTABLE_COLUMNS.has(
          column === 'archived' ? 'isDeleted' : column,
        );

        if (!isSortable) {
          return (
            <TableHead key={column} className="font-semibold text-foreground">
              <div className="flex items-center gap-2">
                {ICON_MAP[column]}
                <span>{COLUMN_LABELS[column] || column}</span>
              </div>
            </TableHead>
          );
        }

        return (
          <TableHead
            key={column}
            className="cursor-pointer font-semibold text-foreground"
            onClick={() => onSort(column === 'archived' ? 'isDeleted' : column)}
          >
            <div className="flex items-center gap-2">
              {ICON_MAP[column]}
              <span>{COLUMN_LABELS[column] || column}</span>
              {getSortIcon(
                column === 'archived' ? 'isDeleted' : column,
                sortField,
                sortDirection,
              )}
            </div>
          </TableHead>
        );
      })}
      {visibleColumns.actions && (
      <TableHead className="w-[50px] font-semibold text-foreground">
        <div className="flex items-center justify-center">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableHead>
      )}
    </TableRow>
  </TableHeader>
));

TableHeaderRow.displayName = 'TableHeaderRow';
