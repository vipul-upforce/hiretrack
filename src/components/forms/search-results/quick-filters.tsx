'use client';

import { Button } from '@/components/ui/button';
import { memo } from 'react';

interface QuickFiltersProps {
  activeFilters: string[];
  onFilterToggle: (filter: string) => void;
  onClearAll: () => void;
}

const FILTER_BUTTONS = [
  { id: 'top-scorer', label: 'Top Scorer' },
  { id: 'unassigned', label: 'Not Assign Job' },
  { id: 'interview-scheduled', label: 'Interview Scheduled' },
  { id: 'exp-1+', label: 'Exp 1+' },
  { id: 'exp-3+', label: 'Exp 3+' },
  { id: 'exp-5+', label: 'Exp 5+' },
  { id: 'applied-this-week', label: 'This Week' },
  { id: 'applied-this-month', label: 'This Month' },
  { id: 'archived', label: 'Archived' },
];

export const QuickFilters = memo(({
  activeFilters,
  onFilterToggle,
  onClearAll,
}: QuickFiltersProps) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm font-medium text-muted-foreground mr-2">
      Quick Filters:
    </span>
    {FILTER_BUTTONS.map((filter) => (
      <Button
        key={filter.id}
        variant={activeFilters.includes(filter.id) ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => onFilterToggle(filter.id)}
        className="text-xs"
      >
        {filter.label}
      </Button>
    ))}
    {activeFilters.length > 0 && (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClearAll}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      Clear All
    </Button>
    )}
  </div>
));

QuickFilters.displayName = 'QuickFilters';
