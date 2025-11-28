import { memo } from "react";
import { QuickFilters } from "./quick-filters";
import { ColumnToggle } from "./column-toggle";
import { BulkActions } from "./bulk-actions";

interface ResultsHeaderProps {
  activeFilters: string[];
  onFilterToggle: (filter: string) => void;
  onClearAllFilters: () => void;
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (column: string, visible: boolean) => void;
  selectedCandidatesCount: number;
  onBulkAssignJob: () => void;
  onBulkArchive: () => void;
  onBulkUnarchive: () => void;
}

export const ResultsHeader = memo(function ResultsHeader({
  activeFilters,
  onFilterToggle,
  onClearAllFilters,
  visibleColumns,
  onColumnToggle,
  selectedCandidatesCount,
  onBulkAssignJob,
  onBulkArchive,
  onBulkUnarchive,
}: ResultsHeaderProps) {
  return (
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
          onArchive={onBulkArchive}
          onUnarchive={onBulkUnarchive}
        />
        <ColumnToggle
          visibleColumns={visibleColumns}
          onColumnToggle={onColumnToggle}
        />
      </div>
    </div>
  );
});

ResultsHeader.displayName = "ResultsHeader";
