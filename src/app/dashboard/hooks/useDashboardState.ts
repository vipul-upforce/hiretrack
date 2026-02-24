import { useState, useRef, useEffect } from 'react';
import { Candidate } from '@/types/candidate';

interface Interviewer {
  count: number;
  interviewerId: string;
  name: string;
  email: string;
}

/**
 * Sort configuration for dashboard assignments.
 * Used for both API requests and client-side SSE sorting.
 */
export type SortField =
  | 'assignment.time'
  | 'name'
  | 'createdAt'
  | 'jobId.title';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

/** Valid sort fields for validation */
const VALID_SORT_FIELDS: SortField[] = [
  'assignment.time',
  'name',
  'createdAt',
  'jobId.title',
];
const VALID_SORT_ORDERS: SortOrder[] = ['asc', 'desc'];

/** localStorage key for sort config */
const SORT_CONFIG_STORAGE_KEY = 'dashboard-sort-config';

/** Default sort configuration */
const DEFAULT_SORT_CONFIG: SortConfig = {
  field: 'assignment.time',
  order: 'asc',
};

/**
 * Retrieves and validates sort config from localStorage.
 * Returns default config if stored value is invalid or missing.
 */
function getStoredSortConfig(): SortConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_SORT_CONFIG;
  }

  try {
    const stored = localStorage.getItem(SORT_CONFIG_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SORT_CONFIG;
    }

    const parsed = JSON.parse(stored) as Partial<SortConfig>;

    // Validate the stored values
    const isValidField = VALID_SORT_FIELDS.includes(parsed.field as SortField);
    const isValidOrder = VALID_SORT_ORDERS.includes(parsed.order as SortOrder);

    if (isValidField && isValidOrder) {
      return parsed as SortConfig;
    }

    return DEFAULT_SORT_CONFIG;
  } catch {
    return DEFAULT_SORT_CONFIG;
  }
}

/**
 * Custom hook to manage all local state for the dashboard page.
 * Consolidates all useState declarations into a single hook.
 */
export function useDashboardState() {
  const [open, setOpen] = useState(false);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [assignments, setAssignments] = useState<Candidate[]>([]);
  const [assignedInterviewers, setAssignedInterviewers] = useState<
    Interviewer[]
  >([]);
  const [assignmentsCounts, setAssignmentsCounts] = useState<{
    [key: string]: number;
  }>({
    totalInterviews: 0,
    thisWeek: 0,
    today: 0,
  });
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [isActivitiesSidebarOpen, setIsActivitiesSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard-notifications-sidebar');
      return stored === null ? true : stored === 'open';
    }
    return true;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Sort configuration - initialized from localStorage, defaults to interview date ascending
  const [sortConfig, setSortConfig] = useState<SortConfig>(getStoredSortConfig);

  // Persist sort config to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SORT_CONFIG_STORAGE_KEY, JSON.stringify(sortConfig));
    }
  }, [sortConfig]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver>(null);
  /** Tracks all candidate IDs included in the current total-count scope (all pages). */
  const totalCountMembershipRef = useRef<Set<string>>(new Set());

  /**
   * Tracks the number of items added via SSE since the last fresh fetch.
   * Used to adjust pagination offset to prevent duplicates when loading more pages.
   * Reset to 0 when filters/sort change and a fresh fetch occurs.
   */
  const sseAddedCountRef = useRef(0);

  return {
    // MultiSelect state
    open,
    setOpen,
    selectedAssignedTo,
    setSelectedAssignedTo,

    // Assignments state
    assignments,
    setAssignments,
    assignedInterviewers,
    setAssignedInterviewers,
    assignmentsCounts,
    setAssignmentsCounts,

    // Candidate dialog state
    selectedCandidate,
    setSelectedCandidate,
    isCandidateDialogOpen,
    setIsCandidateDialogOpen,

    // Sidebar state
    isActivitiesSidebarOpen,
    setIsActivitiesSidebarOpen,

    // Loading state
    isLoading,
    setIsLoading,
    isLoadingMore,
    setIsLoadingMore,

    // Search and filter state
    searchText,
    setSearchText,
    filterText,
    setFilterText,

    // Pagination state
    currentPage,
    setCurrentPage,
    hasMoreData,
    setHasMoreData,

    // Sort state
    sortConfig,
    setSortConfig,

    // Refs
    scrollContainerRef,
    loadingRef,
    observerRef,
    sseAddedCountRef,
    totalCountMembershipRef,
  };
}
