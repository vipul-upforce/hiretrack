'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, ChevronDown, X, Star, Calendar, Clock, MessageSquare, UserCheck, UserX, FileText, FileX, Target } from 'lucide-react';
import {
  BulkReasonRequestPayload,
  CandidateActionType,
} from '@/components/unified-candidate-dialog/types';
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
import { getInterviewerName, isAssigned } from '../utils/candidateAccessors';
import { QuickSelectJobSelector } from './QuickSelectAndFilter/QuickSelectJobSelector';
import bulkActionsAnimationStyles from './QuickSelectAndFilter/BulkActionsAnimations.module.css';

const FILTER_PERSIST_DEBOUNCE_MS = 300;

interface FilterState {
  search: string;
  logicalOperator: 'AND' | 'OR';
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
  archived: boolean;
}

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
    operations?: import('@/app/api/candidates/bulk-update/types').BulkUpdateOperationParams[];
  }) => void;
  jobFilters?: {
    search?: string;
    logicalOperator?: 'AND' | 'OR';
    topCandidates?: boolean;
    appliedThisWeek?: boolean;
    appliedToday?: boolean;
    appliedIn15Days?: boolean;
    toFollowUp?: boolean;
    assigned?: boolean;
    notAssigned?: boolean;
    withRemarks?: boolean;
    withoutRemarks?: boolean;
    archived?: boolean;
  }; // Current filters from job.filter
  totalCandidates?: number; // Total candidates count from API
  totalCandidatesFiltered?: number; // Filtered total candidates count from API
  onRefetch?: () => void | Promise<unknown>; // Callback to manually refetch candidates
  /** Persist filter to localStorage and refetch (replaces server PATCH). Called after debounced filter change. */
  onFilterPersist?: (filter: FilterState) => void;
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
  jobFilters,
  totalCandidates,
  totalCandidatesFiltered,
  onRefetch,
  onFilterPersist,
}: QuickSelectAndFilterProps) {
  const router = useRouter();
  const { toast } = useToast();
  // Initialize filters from job.filter (API response), fallback to defaults
  const getInitialFilters = (): FilterState => {
    if (jobFilters) {
      return {
        search: jobFilters.search || '',
        logicalOperator: jobFilters.logicalOperator || 'AND',
        topCandidates: jobFilters.topCandidates || false,
        appliedThisWeek: jobFilters.appliedThisWeek || false,
        appliedToday: jobFilters.appliedToday || false,
        appliedIn15Days: jobFilters.appliedIn15Days || false,
        toFollowUp: jobFilters.toFollowUp || false,
        assigned: jobFilters.assigned || false,
        notAssigned: jobFilters.notAssigned || false,
        withRemarks: jobFilters.withRemarks || false,
        withoutRemarks: jobFilters.withoutRemarks || false,
        archived: jobFilters.archived || false,
      };
    }
    return {
      search: '',
      logicalOperator: 'AND',
      topCandidates: false,
      appliedThisWeek: false,
      appliedToday: false,
      appliedIn15Days: false,
      toFollowUp: false,
      assigned: false,
      notAssigned: false,
      withRemarks: false,
      withoutRemarks: false,
      archived: false,
    };
  };

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const { selectedCandidates, selectedCandidateIds, clearSelectedCandidates } =
    useMultiSelect();
  const onFilterPersistRef = useRef(onFilterPersist);
  const onRefetchRef = useRef(onRefetch);
  const onFilterChangeRef = useRef(onFilterChange);

  onFilterPersistRef.current = onFilterPersist;
  onRefetchRef.current = onRefetch;
  onFilterChangeRef.current = onFilterChange;

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

  // const {
  //   filters,
  //   setFilters,
  //   filteredCandidates,
  //   handleFilterToggle,
  //   clearAllFilters,
  //   activeFiltersCount,
  // } = useQuickSelectFilters(
  //   candidates,
  //   showArchived,
  //   onFilterChange,
  //   onShowArchivedChange,
  // );

  const [bulkArchive, { isLoading: isArchiving }] = useBulkArchiveCandidatesMutation();

  const openBulkDialog = (action: CandidateActionType) => {
    setBulkActionType(action);
    setIsBulkDialogOpen(true);
  };

  const closeBulkDialogAndClearSelection = useCallback(() => {
    setIsBulkDialogOpen(false);
    setBulkActionType(undefined);
    clearSelectedCandidates();
    void onRefetch?.();
  }, [clearSelectedCandidates, onRefetch]);

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
      await onRefetch?.();
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

  // Initialize `showArchived` from initial filters once so it matches the UI on mount.
  useEffect(() => {
    onShowArchivedChange(Boolean(filters.archived));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute filtered candidates for display purposes (e.g., count)
  const filteredCandidates = useMemo(() => {
    let filtered = [...candidates];

    // Apply archived filter
    // When showArchived is true, show ONLY archived candidates
    // When showArchived is false, show ONLY non-archived candidates
    filtered = filtered.filter(
      (candidate) => showArchived ? candidate.isDeleted : !candidate.isDeleted,
    );

    // Apply text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((candidate) => (
        candidate.name.toLowerCase().includes(searchLower)
        || candidate.skills.some((skill) => skill.toLowerCase().includes(searchLower))
        || candidate.experience.toString().includes(searchLower)
        || getInterviewerName(candidate)
          ?.toLowerCase()
          .includes(searchLower)
        || candidate.location.toLowerCase().includes(searchLower)
      ));
    }

    // Apply other filters
    const activeFilters = [
      {
        key: 'topCandidates',
        filter: (candidate: Candidate) => candidate.scores?.overall && candidate.scores.overall >= 7,
      },
      {
        key: 'appliedThisWeek',
        filter: (candidate: Candidate) => {
          if (!candidate.tracking?.createdAt) return false;
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return new Date(candidate.tracking.createdAt) >= oneWeekAgo;
        },
      },
      {
        key: 'appliedToday',
        filter: (candidate: Candidate) => {
          if (!candidate.tracking?.createdAt) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return (
            new Date(candidate.tracking.createdAt) >= today
            && new Date(candidate.tracking.createdAt) < tomorrow
          );
        },
      },
      {
        key: 'appliedIn15Days',
        filter: (candidate: Candidate) => {
          if (!candidate.tracking?.createdAt) return false;
          const fifteenDaysAgo = new Date();
          fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
          return new Date(candidate.tracking.createdAt) >= fifteenDaysAgo;
        },
      },
      {
        key: 'toFollowUp',
        filter: (candidate: Candidate) => candidate.followUp && candidate.followUp.note,
      },
      {
        key: 'assigned',
        filter: (candidate: Candidate) => isAssigned(candidate),
      },
      {
        key: 'notAssigned',
        filter: (candidate: Candidate) => !isAssigned(candidate),
      },
      {
        key: 'withRemarks',
        filter: (candidate: Candidate) => candidate.remarksCount && candidate.remarksCount > 0,
      },
      {
        key: 'withoutRemarks',
        filter: (candidate: Candidate) => !candidate.remarksCount || candidate.remarksCount === 0,
      },
      {
        key: 'archived',
        filter: (candidate: Candidate) => candidate.isDeleted,
      },
    ].filter((filter) => filters[filter.key as keyof FilterState] === true);

    if (activeFilters.length > 0) {
      if (filters.logicalOperator === 'AND') {
        filtered = filtered.filter((candidate) => activeFilters.every(({ filter }) => filter(candidate)));
      } else {
        filtered = filtered.filter((candidate) => activeFilters.some(({ filter }) => filter(candidate)));
      }
    }

    return filtered;
  }, [candidates, filters, showArchived]);

  // Update filters when they change – persist to localStorage via parent callback
  useEffect(() => {
    onFilterChangeRef.current(filters);

    // Update job filters via API (only on user-initiated changes)
    const updateFilters = async () => {
      try {
        // Build filter object - only include fields that have values
        // Empty strings and false values are omitted to properly clear filters
        const filterObject: {
          search?: string;
          logicalOperator: 'AND' | 'OR';
          topCandidates?: boolean;
          appliedThisWeek?: boolean;
          appliedToday?: boolean;
          appliedIn15Days?: boolean;
          toFollowUp?: boolean;
          assigned?: boolean;
          notAssigned?: boolean;
          withRemarks?: boolean;
          withoutRemarks?: boolean;
          archived?: boolean;
        } = {
          logicalOperator: filters.logicalOperator,
          archived: showArchived,
        };

        // Only add search if it has a value
        if (filters.search && filters.search.trim()) {
          filterObject.search = filters.search;
        }

        // Only add boolean filters if they are true
        if (filters.topCandidates) filterObject.topCandidates = true;
        if (filters.appliedThisWeek) filterObject.appliedThisWeek = true;
        if (filters.appliedToday) filterObject.appliedToday = true;
        if (filters.appliedIn15Days) filterObject.appliedIn15Days = true;
        if (filters.toFollowUp) filterObject.toFollowUp = true;
        if (filters.assigned) filterObject.assigned = true;
        if (filters.notAssigned) filterObject.notAssigned = true;
        if (filters.withRemarks) filterObject.withRemarks = true;
        if (filters.withoutRemarks) filterObject.withoutRemarks = true;
        if (filters.archived) filterObject.archived = true;
        // Persist to localStorage; parent viewState update will trigger a single refetch
        // (do not call onRefetch here — it would run with stale viewState and cause a duplicate request)
        onFilterPersistRef.current?.({
          ...filters,
          ...filterObject,
        } as FilterState);
      } catch {
        // No-op; filter is applied client-side and persisted to localStorage
      }
    };

    // Debounce persist + refetch (callbacks in refs to avoid effect re-run on parent re-render)
    const timeoutId = setTimeout(() => {
      updateFilters();
    }, FILTER_PERSIST_DEBOUNCE_MS);

    // eslint-disable-next-line consistent-return
    return () => clearTimeout(timeoutId);
  }, [filters, showArchived, currentJobId]);

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

  const handleFilterToggle = (filterKey: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }));
  };

  const clearAllFilters = () => {
    onShowArchivedChange(false);
    setFilters({
      search: '',
      logicalOperator: 'AND',
      topCandidates: false,
      appliedThisWeek: false,
      appliedToday: false,
      appliedIn15Days: false,
      toFollowUp: false,
      assigned: false,
      notAssigned: false,
      withRemarks: false,
      withoutRemarks: false,
      archived: false,
    });
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== 'search'
      && key !== 'logicalOperator'
      && filters[key as keyof FilterState] === true,
  ).length;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-t border-b border-gray-200 dark:border-gray-700 ${bulkActionsAnimationStyles.scope}`}>
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
            autoFocus
            className="pl-10 bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                setFilters((prev) => ({ ...prev, search: '' }));
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Dropdown */}
      <DropdownMenu open={isFiltersDropdownOpen} onOpenChange={setIsFiltersDropdownOpen}>
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

          {/* Logical Operator Toggle */}
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>Logical Operator:</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant={
                    filters.logicalOperator === 'AND' ? 'primary' : 'outline'
                  }
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, logicalOperator: 'AND' }))}
                  className="h-6 px-2 text-xs"
                >
                  AND
                </Button>
                <Button
                  variant={
                    filters.logicalOperator === 'OR' ? 'primary' : 'outline'
                  }
                  size="sm"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, logicalOperator: 'OR' }));
                  }}
                  className="h-6 px-2 text-xs"
                >
                  OR
                </Button>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={filters.topCandidates} onCheckedChange={() => handleFilterToggle('topCandidates')} onSelect={(e) => e.preventDefault()}><Star className="h-4 w-4 mr-2" />Top Candidates (7+ score)</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.appliedThisWeek} onCheckedChange={() => handleFilterToggle('appliedThisWeek')} onSelect={(e) => e.preventDefault()}><Calendar className="h-4 w-4 mr-2" />Applied This Week</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.appliedToday} onCheckedChange={() => handleFilterToggle('appliedToday')} onSelect={(e) => e.preventDefault()}><Clock className="h-4 w-4 mr-2" />Applied Today</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.appliedIn15Days} onCheckedChange={() => handleFilterToggle('appliedIn15Days')} onSelect={(e) => e.preventDefault()}><Target className="h-4 w-4 mr-2" />Applied in 15 Days</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={filters.toFollowUp} onCheckedChange={() => handleFilterToggle('toFollowUp')} onSelect={(e) => e.preventDefault()}><MessageSquare className="h-4 w-4 mr-2" />To Follow Up</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.assigned} onCheckedChange={() => handleFilterToggle('assigned')} onSelect={(e) => e.preventDefault()}><UserCheck className="h-4 w-4 mr-2" />Assigned</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.notAssigned} onCheckedChange={() => handleFilterToggle('notAssigned')} onSelect={(e) => e.preventDefault()}><UserX className="h-4 w-4 mr-2" />Not Assigned</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={filters.withRemarks} onCheckedChange={() => handleFilterToggle('withRemarks')} onSelect={(e) => e.preventDefault()}><FileText className="h-4 w-4 mr-2" />With Remarks</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.withoutRemarks} onCheckedChange={() => handleFilterToggle('withoutRemarks')} onSelect={(e) => e.preventDefault()}><FileX className="h-4 w-4 mr-2" />Without Remarks</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={showArchived}
            onCheckedChange={(checked) => {
              onShowArchivedChange(checked);
              // clearAllFilters();
            }}
            onSelect={(e) => e.preventDefault()}
          >
            <FileText className="h-4 w-4 mr-2" />
            Show Archived
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { clearAllFilters(); setIsFiltersDropdownOpen(false); }}>Clear All Filters</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {(() => {
          let filteredCount: number;
          if (totalCandidatesFiltered !== undefined) {
            filteredCount = totalCandidatesFiltered;
          } else {
            filteredCount = filteredCandidates.length;
          }

          let totalCount: number;
          if (totalCandidates !== undefined) {
            totalCount = totalCandidates;
          } else {
            totalCount = candidates.length;
          }

          return `${filteredCount} of ${totalCount} candidates`;
        })()}
      </div>

      {showBulkActions && (
        <div
          className={`will-change-transform transition-[opacity,transform] duration-150 ease-in ${bulkActionsVisible
            ? `${bulkActionsAnimationStyles.bulkActionsEnter} opacity-100 translate-y-0 translate-x-0 scale-100`
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
            className={bulkActionsAnimationStyles.bulkActionsRoot}
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
