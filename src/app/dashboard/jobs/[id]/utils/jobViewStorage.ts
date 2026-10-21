/**
 * Client-side persistence for job board view: filters and per-lane sorting.
 * Stored in localStorage and sent as query params to GET /api/jobs/[id]/candidates.
 */

const STORAGE_PREFIX = 'hiretrack:job:view:';

export interface JobViewFilter {
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
}

function sanitizeFilterForStorage(filter: JobViewFilter | undefined): JobViewFilter {
  if (!filter) return {};
  const { search: _search, ...rest } = filter;
  return rest;
}

export interface LaneSortEntry {
  sortBy: string;
  sortOrder: number; // -1 desc, 1 asc
}

export interface JobViewState {
  filter: JobViewFilter;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  /** Per-lane overrides keyed by lane name (e.g. "Applied", "Shortlisted") */
  laneSort: Record<string, LaneSortEntry>;
}

const DEFAULT_VIEW_STATE: JobViewState = {
  filter: {
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
  },
  sortBy: 'tracking.createdAt',
  sortOrder: 'desc',
  laneSort: {},
};

function storageKey(jobId: string): string {
  return `${STORAGE_PREFIX}${jobId}`;
}

function hasActiveJobViewFilter(
  filter: JobViewFilter | undefined | null,
): boolean {
  if (!filter) return false;

  const searchActive =
    typeof filter.search === 'string' && filter.search.trim().length > 0;

  return (
    searchActive ||
    filter.topCandidates === true ||
    filter.appliedThisWeek === true ||
    filter.appliedToday === true ||
    filter.appliedIn15Days === true ||
    filter.toFollowUp === true ||
    filter.assigned === true ||
    filter.notAssigned === true ||
    filter.withRemarks === true ||
    filter.withoutRemarks === true ||
    filter.archived === true
  );
}

/**
 * Read view state from localStorage. Returns defaults for missing/invalid data.
 */
export function getJobViewState(jobId: string): JobViewState {
  if (typeof window === 'undefined') return DEFAULT_VIEW_STATE;
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    if (!raw) return DEFAULT_VIEW_STATE;
    const parsed = JSON.parse(raw) as Partial<JobViewState>;
    const parsedFilter = parsed.filter ?? {};
    const { search: _legacySearch, ...parsedFilterWithoutSearch } = parsedFilter;

    return {
      filter: { ...DEFAULT_VIEW_STATE.filter, ...parsedFilterWithoutSearch },
      sortBy:
        typeof parsed.sortBy === 'string'
          ? parsed.sortBy
          : DEFAULT_VIEW_STATE.sortBy,
      sortOrder:
        parsed.sortOrder === 'asc' || parsed.sortOrder === 'desc'
          ? parsed.sortOrder
          : DEFAULT_VIEW_STATE.sortOrder,
      laneSort:
        parsed.laneSort && typeof parsed.laneSort === 'object'
          ? parsed.laneSort
          : {},
    };
  } catch {
    return DEFAULT_VIEW_STATE;
  }
}

/**
 * Write view state to localStorage.
 */
export function setJobViewState(jobId: string, state: JobViewState): void {
  if (typeof window === 'undefined') return;
  try {
    const persistedState: JobViewState = {
      ...state,
      // Search should never be persisted in localStorage.
      filter: {
        ...DEFAULT_VIEW_STATE.filter,
        ...sanitizeFilterForStorage(state.filter),
      },
    };

    localStorage.setItem(storageKey(jobId), JSON.stringify(persistedState));
  } catch {
    // Ignore quota or parse errors
  }
}

/**
 * Build query params for GET /api/jobs/[id]/candidates from view state.
 * Omits params that match defaults to keep URLs short.
 */
export function buildCandidatesQueryParams(view: JobViewState): string {
  const params = new URLSearchParams();

  if (hasActiveJobViewFilter(view.filter)) {
    params.set('filter', JSON.stringify(view.filter));
  }
  if (view.sortBy && view.sortBy !== DEFAULT_VIEW_STATE.sortBy) {
    params.set('sortBy', view.sortBy);
  }
  if (view.sortOrder && view.sortOrder !== DEFAULT_VIEW_STATE.sortOrder) {
    params.set('sortOrder', view.sortOrder);
  }
  if (view.laneSort && Object.keys(view.laneSort).length > 0) {
    params.set('laneSort', JSON.stringify(view.laneSort));
  }
  return params.toString();
}

/**
 * Build the argument payload expected by the RTK Query candidates endpoint.
 * This is what `useLazyFetchCandidatesQuery` / `useFetchCandidatesQuery` expect.
 */
export interface CandidatesFetchQueryArgs {
  jobId: string;
  filter?: JobViewFilter;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  laneSort?: Record<string, LaneSortEntry>;
}

export function buildCandidatesQueryArgs(
  jobId: string,
  view: JobViewState,
): CandidatesFetchQueryArgs {
  const filter = hasActiveJobViewFilter(view.filter) ? view.filter : undefined;

  const defaultSortBy = DEFAULT_VIEW_STATE.sortBy; // 'tracking.createdAt'
  const defaultSortOrder = DEFAULT_VIEW_STATE.sortOrder; // 'desc'

  return {
    jobId,
    filter,
    sortBy:
      view.sortBy && view.sortBy !== defaultSortBy ? view.sortBy : undefined,
    sortOrder:
      view.sortOrder && view.sortOrder !== defaultSortOrder
        ? view.sortOrder
        : undefined,
    laneSort:
      view.laneSort && Object.keys(view.laneSort).length > 0
        ? view.laneSort
        : undefined,
  };
}
