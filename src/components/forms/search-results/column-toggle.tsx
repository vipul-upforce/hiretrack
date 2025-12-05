'use client';

import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { memo, useCallback } from 'react';

interface ColumnToggleProps {
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (column: string, visible: boolean) => void;
}

const COLUMN_LABELS: Record<string, string> = {
  select: 'SELECT',
  name: 'NAME',
  skills: 'SKILLS',
  location: 'LOCATION',
  jobAssignment: 'JOB ASSIGNMENT',
  overallScore: 'OVERALL SCORE',
  expectedCTC: 'ECTC',
  currentCTC: 'CCTC',
  experience: 'EXPERIENCE',
  createdAt: 'APPLIED',
  archived: 'ARCHIVED',
  actions: 'ACTIONS',
};

export const ColumnToggle = memo(({
  visibleColumns,
  onColumnToggle,
}: ColumnToggleProps) => {
  const handleCheckedChange = useCallback(
    (column: string, checked: boolean | 'indeterminate') => {
      onColumnToggle(column, !!checked);
    },
    [onColumnToggle],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 cursor-pointer">
        {Object.entries(visibleColumns).map(([key, value]) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={value}
            onCheckedChange={(checked) => handleCheckedChange(key, checked)}
          >
            {COLUMN_LABELS[key] || key.toUpperCase()}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

ColumnToggle.displayName = 'ColumnToggle';
