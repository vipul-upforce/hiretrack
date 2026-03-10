'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { CandidateActionType } from '@/components/unified-candidate-dialog/types';
import { Job } from '@/types/job';
import { Candidate } from '@/types/candidate';
import { useRouter } from 'next/navigation';
import { useFetchJobsQuery } from '@/lib/features/job/jobApi';
import { useBulkArchiveCandidatesMutation } from '@/lib/features/candidate/candidateApi';
import { useToast } from '@/hooks/use-toast';
import useMultiSelect from './Candidate/candidate-card/hooks/useMultiSelect';
import { UnifiedCandidateActionsDialog } from './Dialogs/unified-candidate-actions-dialog';
import { BulkActionsDropdown } from './BulkActionsDropdown';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import {
  useQuickSelectFilters,
  type FilterState,
} from './QuickSelectAndFilter/useQuickSelectFilters';
import { QuickSelectJobSelector } from './QuickSelectAndFilter/QuickSelectJobSelector';
import { QuickSelectFiltersDropdown } from './QuickSelectAndFilter/QuickSelectFiltersDropdown';
import bulkActionsAnimationStyles from './QuickSelectAndFilter/BulkActionsAnimations.module.css';

export type { FilterState };

interface QuickSelectAndFilterProps {
  currentJobId: string;
  candidates: Candidate[];
  onFilterChange: (filterConditions: FilterState) => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  onValidateStatusChange?: (
    candidate: Candidate,
    newStatus: string,
  ) => { requiresChecklist: boolean; validationInfo?: string } | null;
  onBulkStatusRequiresChecklist?: (
    queue: import('@/components/unified-candidate-dialog/types').BulkStatusQueueItem[],
  ) => void;
  onDeferStatusToChecklist?: (
    validationInfo: string,
    newStatus: string,
    nextChecklistValidationInfo?: string,
  ) => void;
  onOpenChecklistAfterSave?: (validationInfo: string) => void;
  /** When job has promptForStatusChangeReason and bulk status update: open bulk reason dialog */
  onBulkStatusRequiresReason?: (payload: {
    candidateIds: string[];
    newStatus: string;
  }) => void;
}

export function QuickSelectAndFilter({
  currentJobId,
  candidates,
  onFilterChange,
  showArchived,
  onShowArchivedChange,
  onValidateStatusChange,
  onBulkStatusRequiresChecklist,
  onDeferStatusToChecklist,
  onOpenChecklistAfterSave,
  onBulkStatusRequiresReason,
}: QuickSelectAndFilterProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const { selectedCandidates, selectedCandidateIds, clearSelectedCandidates } =
    useMultiSelect();
  const { data: jobs } = useFetchJobsQuery(undefined);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionsVisible, setBulkActionsVisible] = useState(false);
  const [lastSelectedCount, setLastSelectedCount] = useState(0);
  const bulkActionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<CandidateActionType | undefined>();
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [pendingArchiveAction, setPendingArchiveAction] = useState<
    'archive' | 'unarchive' | null
  >(null);

  const {
    filters,
    setFilters,
    filteredCandidates,
    handleFilterToggle,
    clearAllFilters,
    activeFiltersCount,
  } = useQuickSelectFilters(
    candidates,
    showArchived,
    onFilterChange,
    onShowArchivedChange,
  );

  const [bulkArchive, { isLoading: isArchiving }] = useBulkArchiveCandidatesMutation();

  const openBulkDialog = (action: CandidateActionType) => {
    setBulkActionType(action);
    setIsBulkDialogOpen(true);
  };

  const closeBulkDialogAndClearSelection = useCallback(() => {
    setIsBulkDialogOpen(false);
    setBulkActionType(undefined);
    clearSelectedCandidates();
  }, [clearSelectedCandidates]);

  const handleBulkArchive = async (action: 'archive' | 'unarchive') => {
    if (selectedCandidateIds.length === 0) return;
    try {
      const result = await bulkArchive({
        candidateIds: selectedCandidateIds,
        action,
      }).unwrap();
      toast({ title: 'Success', description: result.message });
      clearSelectedCandidates();
      setIsArchiveConfirmOpen(false);
      setPendingArchiveAction(null);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${action} candidates`,
        variant: 'destructive',
      });
    }
  };

  const openArchiveConfirm = (action: 'archive' | 'unarchive') => {
    setPendingArchiveAction(action);
    setIsArchiveConfirmOpen(true);
  };

  useEffect(() => {
    if (selectedCandidates.length > 0) {
      setLastSelectedCount(selectedCandidates.length);
      setShowBulkActions(true);
      if (bulkActionsTimeoutRef.current) {
        clearTimeout(bulkActionsTimeoutRef.current);
        bulkActionsTimeoutRef.current = null;
      }
      requestAnimationFrame(() => setBulkActionsVisible(true));
      return () => { };
    }
    setBulkActionsVisible(false);
    bulkActionsTimeoutRef.current = setTimeout(() => setShowBulkActions(false), 200);
    return () => {
      if (bulkActionsTimeoutRef.current) {
        clearTimeout(bulkActionsTimeoutRef.current);
        bulkActionsTimeoutRef.current = null;
      }
    };
  }, [selectedCandidates.length]);

  const groupedJobs = useMemo(() => {
    if (!jobs) return { open: [], draft: [], closed: [] };
    return jobs.reduce<{ open: Job[]; draft: Job[]; closed: Job[] }>(
      (acc, job) => {
        if (job.isDeleted) acc.closed.push(job);
        else if (job.status === 'open') acc.open.push(job);
        else acc.draft.push(job);
        return acc;
      },
      { open: [], draft: [], closed: [] },
    );
  }, [jobs]);

  const jobCandidateCounts = useMemo(() => {
    if (!jobs) return {};
    const counts: Record<string, number> = {};
    jobs.forEach((job) => {
      counts[job._id] = job.candidateCount || 0;
    });
    return counts;
  }, [jobs]);

  const handleJobSelect = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-t border-b border-gray-200 dark:border-gray-700">
      <QuickSelectJobSelector
        currentJobId={currentJobId}
        groupedJobs={groupedJobs}
        jobCandidateCounts={jobCandidateCounts}
        onJobSelect={handleJobSelect}
      />

      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search candidates..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="pl-10 bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <QuickSelectFiltersDropdown
        filters={filters}
        setFilters={setFilters}
        onFilterToggle={handleFilterToggle}
        onClearAll={clearAllFilters}
        showArchived={showArchived}
        onShowArchivedChange={onShowArchivedChange}
        activeFiltersCount={activeFiltersCount}
        isOpen={isFiltersDropdownOpen}
        onOpenChange={setIsFiltersDropdownOpen}
      />

      <div className="text-sm text-gray-500 dark:text-gray-400">
        {filteredCandidates.length} of {candidates.length} candidates
      </div>

      {showBulkActions && (
        <div
          className={`will-change-transform transition-[opacity,transform] duration-150 ease-in ${bulkActionsVisible
            ? 'bulk-actions-enter opacity-100 translate-y-0 translate-x-0 scale-100'
            : 'pointer-events-none opacity-0 -translate-y-3 translate-x-2 scale-90'
            }`}
        >
          <BulkActionsDropdown
            selectedCount={selectedCandidates.length || lastSelectedCount}
            showArchived={showArchived}
            isArchiving={isArchiving}
            onClearSelection={clearSelectedCandidates}
            onOpenDialog={openBulkDialog}
            onArchiveClick={openArchiveConfirm}
            className="bulk-actions-root"
          />
        </div>
      )}

      {isBulkDialogOpen && selectedCandidates.length > 0 && (
        <UnifiedCandidateActionsDialog
          candidate={selectedCandidates[0]}
          candidates={selectedCandidates}
          isOpen={isBulkDialogOpen}
          onOpenChange={(open) => {
            if (!open) closeBulkDialogAndClearSelection();
            else setIsBulkDialogOpen(true);
          }}
          initialAction={bulkActionType}
          onSuccess={closeBulkDialogAndClearSelection}
          onValidateStatusChange={onValidateStatusChange}
          onBulkStatusRequiresChecklist={onBulkStatusRequiresChecklist}
          onDeferStatusToChecklist={
            onDeferStatusToChecklist
              ? (validationInfo, newStatus, next) => {
                setIsBulkDialogOpen(false);
                onDeferStatusToChecklist(validationInfo, newStatus, next);
              }
              : undefined
          }
          onOpenChecklistAfterSave={
            onOpenChecklistAfterSave
              ? (validationInfo) => {
                setIsBulkDialogOpen(false);
                onOpenChecklistAfterSave(validationInfo);
              }
              : undefined
          }
          onBulkStatusRequiresReason={
            onBulkStatusRequiresReason
              ? (payload) => {
                  setIsBulkDialogOpen(false);
                  onBulkStatusRequiresReason(payload);
                }
              : undefined
          }
        />
      )}

      <ArchiveConfirmDialog
        isOpen={isArchiveConfirmOpen}
        setIsOpen={(open) => {
          setIsArchiveConfirmOpen(open);
          if (!open) setPendingArchiveAction(null);
        }}
        action={pendingArchiveAction}
        count={selectedCandidateIds.length}
        isLoading={isArchiving}
        onConfirm={handleBulkArchive}
        onClose={() => {
          setIsArchiveConfirmOpen(false);
          setPendingArchiveAction(null);
        }}
      />

      <span className={bulkActionsAnimationStyles.bootstrap} aria-hidden="true" />
    </div>
  );
}
