'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  Settings2,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useRouter, useParams } from 'next/navigation';
import { useFetchJobsQuery } from '@/lib/features/job/jobApi';
import { Job } from '@/types/job';
import { QuickSelectJobSelector } from '../QuickSelectAndFilter/QuickSelectJobSelector';
import { QuickSelectFiltersDropdown } from '../QuickSelectAndFilter/QuickSelectFiltersDropdown';
import { useGetLanesQuery, useGetJobLanesQuery } from '@/lib/features/lane/laneApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { FilterState } from '../../types/filter.types.ts';

const DEFAULT_COLUMNS_LIST = [
  { id: 'name', label: 'Name' },
  { id: 'status', label: 'Status' },
  { id: 'location', label: 'Location' },
  { id: 'appliedDate', label: 'Applied Date' },
  { id: 'skills', label: 'Skills' },
  { id: 'currentCTC', label: 'Current CTC' },
  { id: 'expectedCTC', label: 'Expected CTC' },
  { id: 'noticePeriod', label: 'Notice Period' },
  { id: 'aiScore', label: 'AI Evaluation' },
  { id: 'followUp', label: 'Follow up' },
];

const SORT_OPTIONS = [
  { label: 'Recently Applied', value: 'dateTime', order: 'desc' as const },
  { label: 'Oldest Applied', value: 'dateTime', order: 'asc' as const },
  { label: 'Last Modified (Newest)', value: 'tracking.updatedAt', order: 'desc' as const },
  { label: 'Last Modified (Oldest)', value: 'tracking.updatedAt', order: 'asc' as const },
  // Nearest follow-up first (today, then tomorrow, then later)
  { label: 'Follow Up (Nearest)', value: 'followUp.date', order: 'asc' as const },
  { label: 'Follow Up (Farthest)', value: 'followUp.date', order: 'desc' as const },
  { label: 'Name (A-Z)', value: 'name', order: 'asc' as const },
  { label: 'Name (Z-A)', value: 'name', order: 'desc' as const },
  { label: 'Highest AI Score', value: 'scores.overall', order: 'desc' as const },
  { label: 'Lowest AI Score', value: 'scores.overall', order: 'asc' as const },
];

interface CandidateTableFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  visibleColumns: Record<string, boolean>;
  onColumnToggle: (columns: Record<string, boolean>) => void;
  totalCount: number;
  filteredCount: number;
}

export function CandidateTableFilters({
  filters,
  onFilterChange,
  onClearFilters,
  visibleColumns,
  onColumnToggle,
  totalCount,
  filteredCount,
}: CandidateTableFiltersProps) {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAppSelector((state) => state.auth || {});
  const { data: jobs } = useFetchJobsQuery(undefined);
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);

  const { data: userLanesData } = useGetLanesQuery({ userId: user?.id });
  const { data: jobLanesData } = useGetJobLanesQuery(id);
  const lanesData = jobLanesData || userLanesData;
  const lanes = (lanesData?.lanes as (string | { name: string; id?: string; _id?: string })[]) || [];

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

  const activeFiltersCount = useMemo(
    () =>
      (Object.keys(filters) as Array<keyof FilterState>).filter(
        (key) =>
          key !== 'search' &&
          key !== 'logicalOperator' &&
          key !== 'status' &&
          key !== 'sortBy' &&
          key !== 'sortOrder' &&
          key !== 'isArchived' &&
          filters[key] === true,
      ).length,
    [filters],
  );

  const handleFilterToggle = (key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const toggleColumn = (columnId: string) => {
    onColumnToggle({
      ...visibleColumns,
      [columnId]: !visibleColumns[columnId],
    });
  };

  const currentSortLabel = useMemo(() => {
    const sort = SORT_OPTIONS.find(s => s.value === filters.sortBy && s.order === filters.sortOrder);
    return sort ? sort.label : 'Sort';
  }, [filters.sortBy, filters.sortOrder]);

  return (
    <div className="flex flex-col border-t border-b dark:border-gray-800">
      <div className="flex items-center gap-3 py-3 bg-white dark:bg-black">
        {/* Job Selector */}
        <QuickSelectJobSelector
          currentJobId={id}
          groupedJobs={groupedJobs}
          jobCandidateCounts={jobCandidateCounts}
          onJobSelect={handleJobSelect}
        />

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search candidates..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="pl-10 bg-white dark:bg-black border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => onFilterChange({ ...filters, search: '' })}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Status Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2  min-w-[140px] justify-between">
              <span className="truncate max-w-[100px]">{filters.status === 'all' ? 'All Statuses' : filters.status}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={filters.status} onValueChange={(val) => onFilterChange({ ...filters, status: val })}>
              <DropdownMenuRadioItem value="all">All Statuses</DropdownMenuRadioItem>
              {lanes.map((lane) => {
                const name = typeof lane === 'string' ? lane : lane.name;
                const laneId = typeof lane === 'string' ? lane : (lane.id || lane._id);
                return (
                  <DropdownMenuRadioItem key={laneId} value={name}>
                    {name}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sort Results</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={(val) => {
                const [sortBy, sortOrder] = val.split('-');
                onFilterChange({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={`${opt.value}-${opt.order}`} value={`${opt.value}-${opt.order}`}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filters Dropdown */}
        <QuickSelectFiltersDropdown
          filters={filters}
          setFilters={(val) => {
            if (typeof val === 'function') {
              onFilterChange(val(filters));
            } else {
              onFilterChange(val);
            }
          }}
          onFilterToggle={handleFilterToggle}
          onClearAll={onClearFilters}
          showArchived={filters.isArchived}
          onShowArchivedChange={(val) => onFilterChange({ ...filters, isArchived: val })}
          activeFiltersCount={activeFiltersCount}
          isOpen={isFiltersDropdownOpen}
          onOpenChange={setIsFiltersDropdownOpen}
        />

        {/* Column Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-gray-500" />
              <span className="hidden lg:inline">Columns</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
            <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEFAULT_COLUMNS_LIST.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns[col.id]}
                onCheckedChange={() => toggleColumn(col.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto whitespace-nowrap hidden xl:block">
          {totalCount} total candidates
        </div>
      </div>
    </div>
  );
}
