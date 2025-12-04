import { memo } from 'react';
import { QuickFilters } from './quick-filters';
import { ColumnToggle } from './column-toggle';
import { BulkActions } from './bulk-actions';

interface ResultsHeaderProps {
  activeFilters: string[];
  onFilterToggle: (filter: string) => void;
  onClearAllFilters: () => void;
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (column: string, visible: boolean) => void;
  selectedCandidatesCount: number;
  onBulkAssignJob: () => void;
  onBulkDelete: () => void;
}

export const ResultsHeader = memo(({
  activeFilters,
  onFilterToggle,
  onClearAllFilters,
  visibleColumns,
  onColumnToggle,
  selectedCandidatesCount,
  onBulkAssignJob,
  onBulkDelete,
}: ResultsHeaderProps) => (
  <div className="flex justify-between items-center p-4 border-b">
    <QuickFilters
      activeFilters={activeFilters}
      onFilterToggle={onFilterToggle}
      onClearAll={onClearAllFilters}
    />

    <div className="flex items-center gap-2">
      <BulkActions
        selectedCount={selectedCandidatesCount}
        onAssignJob={onBulkAssignJob}
        onDelete={onBulkDelete}
      />
      <ColumnToggle
        visibleColumns={visibleColumns}
        onColumnToggle={onColumnToggle}
      />
    </div>
  </div>
));

ResultsHeader.displayName = 'ResultsHeader';
