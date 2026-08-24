/* eslint-disable max-lines */
import { baseApi } from '@/lib/api/baseApi';
import { Candidate } from '@/types/candidate';
import type { Draft } from 'immer';
import { ICandidateHistory } from '@/lib/models/history';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { OrgInfo } from '@/lib/models/user';
import { LANE_PAGE_SIZE } from '@/lib/constants/lanePagination';
import { NextResponse } from 'next/server';

interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
  orgId?: string;
}

interface ICandidate {
  id: string;
  name: string;
  email: string;
  role?: string;
  organizationInfo?: OrgInfo;
}
interface AuthResponse {
  message: string;
  user: ICandidate;
  _id?: string;
  organizations?: OneOfMulOrganization[];
}

export interface EmailAttachment {
  fileName: string;
  fileSize: number;
  shareId: string;
  shareUrl: string;
}

/**
 * An entry representing the assignment count for a specific interviewer.
 */
export interface InterviewerAssignmentCountEntry {
  interviewerId: string; // User _id as string
  name: string;
  email: string;
  count: number;
}

export interface SendEmailToCandidateRequest {
  candidateId: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailToCandidateResponse {
  success: boolean;
  message: string;
  emailHistoryId?: string;
}

export interface UpdateRemarkRequest {
  id: string;
  description: string;
  rating?: number | null;
  isPrivate?: boolean;
}

export interface ShareCandidateRequest {
  candidateId: string;
  selection: Record<string, boolean>;
}

interface DuplicateEntry {
  candidateId: string;
  name: string;
  email: string;
  expectedCTC?: number;
  currentCTC?: number;
  experience?: number;
  relevantExperience?: number;
  jobId?: string;
  jobTitle?: string;
  appliedDate?: string;
  isDeleted?: boolean;
}

interface EvaluateCandidateResponse {
  message: string;
  candidate?: unknown;
  error?: string;
}

/** Response fields from POST /candidates/bulk-update used by the client cache layer */
export interface BulkUpdateCandidatesMutationResult {
  success: boolean;
  message: string;
  updatedCount: number;
  failedCount: number;
  skippedCount?: number;
  /** Full updated documents from the API (same shape as SSE broadcast) */
  candidatesToBroadcast?: Candidate[];
}

type FetchCandidatesGroupedDraft = {
  lanes: Record<
    string,
    {
      candidates: Candidate[];
      count: number;
      hasMore: boolean;
      page: number;
      totalPages: number;
      pageInfo?: {
        hasNextPage: boolean;
        nextCursor: string | null;
      };
      sorting: {
        sortBy: string;
        sortOrder: 'asc' | 'desc';
      };
      filters: string[];
    }
  >;
};

function extractJobIdFromCandidateForCache(c: Candidate): string | undefined {
  const j = c.jobId as unknown;
  if (typeof j === 'string' && j.trim()) return j;
  if (j && typeof j === 'object' && j !== null && '_id' in j) {
    const id = (j as { _id?: unknown })._id;
    if (typeof id === 'string' && id) return id;
    if (id != null) return String(id);
  }
  return undefined;
}

function getLaneKeyFromCandidateStatus(c: Candidate): string | null {
  const s = c.status as unknown;
  if (typeof s === 'string' && s.trim()) return s.toLowerCase();
  if (s && typeof s === 'object' && s !== null && 'name' in s) {
    const n = (s as { name?: unknown }).name;
    if (typeof n === 'string' && n.trim()) return n.toLowerCase();
  }
  return null;
}

function mergeBulkServerCandidateIntoDraft(
  target: Draft<Candidate>,
  incoming: Candidate,
): void {
  Object.entries(incoming).forEach(([key, value]) => {
    if (value !== undefined) {
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  });
}

/** Last write wins when the API returns the same id more than once */
function dedupeBulkUpdatesByCandidateId(updates: Candidate[]): Candidate[] {
  const byId = new Map<string, Candidate>();
  for (const c of updates) {
    byId.set(String(c._id), c);
  }
  return [...byId.values()];
}

/**
 * Apply bulk-update payloads to grouped `fetchCandidates` cache.
 * Removes each id from every lane, then inserts the server document into the target lane so
 * candidates that were only in paginated lane caches (not on grouped "first page") still appear
 * updated when merged into the job view — without refetching.
 */
function applyBulkUpdatesToFetchCandidatesDraft(
  draft: FetchCandidatesGroupedDraft,
  updates: Candidate[],
  jobIdConstraint: string,
): void {
  const list = dedupeBulkUpdatesByCandidateId(
    updates.filter(
      (c) => extractJobIdFromCandidateForCache(c) === jobIdConstraint,
    ),
  );
  for (const incoming of list) {
    const newLane = getLaneKeyFromCandidateStatus(incoming);
    if (!newLane) continue;

    for (const laneKey of Object.keys(draft.lanes)) {
      const lane = draft.lanes[laneKey];
      const idx = lane.candidates.findIndex((x) => x._id === incoming._id);
      if (idx !== -1) {
        lane.candidates.splice(idx, 1);
      }
    }

    const targetLane = draft.lanes[newLane];
    if (!targetLane) continue;

    const fresh = { ...incoming } as Candidate;
    targetLane.candidates.unshift(fresh);
    // Intentionally do not mutate `lane.count` — it is the server total for the lane, not
    // `candidates.length` (first page / merged slice). Adjusting it here caused wrong totals.
  }
}

type FetchLaneCandidatesDraft = {
  candidates: Candidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  pageInfo?: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
  sorting: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  filters: string[];
  meta: {
    jobId: string;
    lane: string;
  };
};

function applyBulkUpdatesToLaneCandidatesDraft(
  draft: FetchLaneCandidatesDraft,
  updates: Candidate[],
  laneName: string | undefined,
  jobIdConstraint: string | undefined,
): void {
  if (!laneName) return;
  const laneKey = laneName.toLowerCase();
  const list = dedupeBulkUpdatesByCandidateId(
    updates.filter(
      (c) =>
        !jobIdConstraint ||
        extractJobIdFromCandidateForCache(c) === jobIdConstraint,
    ),
  );
  for (const incoming of list) {
    const newLane = getLaneKeyFromCandidateStatus(incoming);
    if (!newLane) continue;
    const idx = draft.candidates.findIndex((x) => x._id === incoming._id);
    if (idx !== -1) {
      if (newLane === laneKey) {
        mergeBulkServerCandidateIntoDraft(
          draft.candidates[idx] as Draft<Candidate>,
          incoming,
        );
      } else {
        draft.candidates.splice(idx, 1);
        draft.pagination.total = Math.max(0, draft.pagination.total - 1);
      }
    } else if (newLane === laneKey) {
      draft.candidates.unshift({ ...incoming } as Candidate);
    }
  }
}

function extractLaneNameForCache(candidate: Partial<Candidate>): string | null {
  const status = candidate.status as unknown;
  if (typeof status === 'string' && status.trim()) return status.toLowerCase();
  if (
    status &&
    typeof status === 'object' &&
    status !== null &&
    'name' in status
  ) {
    const { name } = status as { name?: unknown };
    if (typeof name === 'string' && name.trim()) return name.toLowerCase();
  }
  return null;
}

function patchCandidateInGroupedCache(
  draft: FetchCandidatesGroupedDraft,
  incoming: Candidate,
): void {
  const nextLaneKey = extractLaneNameForCache(incoming);
  let sourceLaneKey: string | null = null;
  let sourceIndex = -1;

  for (const laneKey of Object.keys(draft.lanes)) {
    const idx = draft.lanes[laneKey].candidates.findIndex(
      (candidate) => candidate._id === incoming._id,
    );
    if (idx !== -1) {
      sourceLaneKey = laneKey;
      sourceIndex = idx;
      break;
    }
  }

  if (sourceLaneKey === null || sourceIndex === -1) return;
  const sourceLane = draft.lanes[sourceLaneKey];
  const sourceCandidate = sourceLane.candidates[sourceIndex];

  if (
    !nextLaneKey ||
    !draft.lanes[nextLaneKey] ||
    nextLaneKey === sourceLaneKey
  ) {
    mergeBulkServerCandidateIntoDraft(
      sourceCandidate as Draft<Candidate>,
      incoming,
    );
    return;
  }

  // Candidate moved to another lane: remove from source and prepend into target lane.
  sourceLane.candidates.splice(sourceIndex, 1);
  const moved = { ...sourceCandidate, ...incoming } as Candidate;
  draft.lanes[nextLaneKey].candidates.unshift(moved);
}

function patchCandidateInLaneCache(
  draft: FetchLaneCandidatesDraft,
  incoming: Candidate,
  laneName: string | undefined,
): void {
  if (!laneName) return;
  const currentLaneKey = laneName.toLowerCase();
  const nextLaneKey = extractLaneNameForCache(incoming);
  const idx = draft.candidates.findIndex(
    (candidate) => candidate._id === incoming._id,
  );
  if (idx === -1) return;

  if (!nextLaneKey || nextLaneKey === currentLaneKey) {
    mergeBulkServerCandidateIntoDraft(
      draft.candidates[idx] as Draft<Candidate>,
      incoming,
    );
    return;
  }

  draft.candidates.splice(idx, 1);
  draft.pagination.total = Math.max(0, draft.pagination.total - 1);
}

export const candidateApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Lane sorting configuration
     */
    fetchCandidates: builder.query<
      {
        lanes: Record<
          string,
          {
            candidates: Candidate[];
            count: number;
            hasMore: boolean;
            page: number;
            totalPages: number;
            pageInfo?: {
              hasNextPage: boolean;
              nextCursor: string | null;
            };
            sorting: {
              sortBy: string;
              sortOrder: 'asc' | 'desc';
            };
            filters: string[];
          }
        >;
        meta: {
          jobId: string;
          useCustomLanes: boolean;
          availableLanes: string[];
          laneMapping: Record<string, string>;
          totalCandidates: number;
          totalCandidatesUnfiltered?: number;
          totalCandidatesFiltered?: number;
          filters?: string[];
          filter?: {
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
            startDate?: Date;
            endDate?: Date;
          };
        };
      },
      {
        jobId: string;
        filter?: Record<string, unknown>;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        laneSort?: Record<string, { sortBy: string; sortOrder: number }>;
      }
    >({
      // laneSort is used by the backend for initial per-lane sorting config, but interactive lane sorting
      // is handled by the lane-scoped endpoint. We intentionally exclude laneSort from the cache key so
      // changing lane sort doesn't trigger a grouped (all-lanes) refetch that resets the UI.
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { jobId, filter, sortBy, sortOrder } = queryArgs;
        return `${endpointName}|jobId=${jobId}|filter=${JSON.stringify(filter ?? {})}|sortBy=${sortBy ?? ''}|sortOrder=${sortOrder ?? ''}`;
      },
      query: ({ jobId, filter, sortBy, sortOrder, laneSort }) => {
        const params = new URLSearchParams();
        // Only send filter when at least one filter is active (URLSearchParams encodes once)
        if (filter && Object.keys(filter).length > 0) {
          params.set('filter', JSON.stringify(filter));
        }
        // Only send sort when different from defaults (avoids noisy URLs and cache churn)
        const defaultSortBy = 'tracking.createdAt';
        const defaultSortOrder = 'desc';
        if (sortBy && sortBy !== defaultSortBy) params.set('sortBy', sortBy);
        if (sortOrder && sortOrder !== defaultSortOrder)
          params.set('sortOrder', sortOrder);
        if (laneSort && Object.keys(laneSort).length > 0) {
          params.set('laneSort', JSON.stringify(laneSort));
        }
        const q = params.toString();
        return `/jobs/${jobId}/candidates${q ? `?${q}` : ''}`;
      },
      providesTags: ['Candidate'],
    }),
    /** Filter-aware lane counts only (fast aggregation; no candidate documents). */
    fetchJobLaneCounts: builder.query<
      {
        lanes: Record<string, { count: number }>;
        meta: {
          jobId: string;
          useCustomLanes: boolean;
          availableLanes: string[];
          laneMapping: Record<string, string>;
          totalCandidates: number;
          totalCandidatesUnfiltered?: number;
          totalCandidatesFiltered?: number;
          filters?: string[];
          filter?: Record<string, unknown>;
        };
      },
      {
        jobId: string;
        filter?: Record<string, unknown>;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      }
    >({
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { jobId, filter, sortBy, sortOrder } = queryArgs;
        return `${endpointName}|jobId=${jobId}|filter=${JSON.stringify(filter ?? {})}|sortBy=${sortBy ?? ''}|sortOrder=${sortOrder ?? ''}`;
      },
      query: ({ jobId, filter, sortBy, sortOrder }) => {
        const params = new URLSearchParams();
        params.set('countsOnly', 'true');
        if (filter && Object.keys(filter).length > 0) {
          params.set('filter', JSON.stringify(filter));
        }
        const defaultSortBy = 'tracking.createdAt';
        const defaultSortOrder = 'desc';
        if (sortBy && sortBy !== defaultSortBy) params.set('sortBy', sortBy);
        if (sortOrder && sortOrder !== defaultSortOrder) {
          params.set('sortOrder', sortOrder);
        }
        const q = params.toString();
        return `/jobs/${jobId}/candidates${q ? `?${q}` : ''}`;
      },
      providesTags: ['Candidate'],
    }),
    /**
     * Fetch more candidates for a specific lane with pagination
     * Used for infinite scroll in KanbanColumn
     *
     * Response structure:
     * {
     *   candidates: Candidate[];
     *   pagination: {
     *     page: number;
     *     limit: number;
     *     total: number;
     *     totalPages: number;
     *     hasNextPage: boolean;
     *     hasPreviousPage: boolean;
     *   };
     *   sorting: {
     *     sortBy: string;
     *     sortOrder: 'asc' | 'desc';
     *   };
     *   filters: string[];
     *   meta: {
     *     jobId: string;
     *     lane: string;
     *   }
     * }
     */
    fetchLaneCandidates: builder.query<
      {
        candidates: Candidate[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
        pageInfo?: {
          hasNextPage: boolean;
          nextCursor: string | null;
        };
        sorting: {
          sortBy: string;
          sortOrder: 'asc' | 'desc';
        };
        filters: string[];
        meta: {
          jobId: string;
          lane: string;
        };
      },
      {
        jobId: string;
        laneName: string;
        page?: number;
        limit?: number;
        cursor?: string;
        filter?: Record<string, unknown>;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        laneSort?: Record<string, { sortBy: string; sortOrder: 1 | -1 }>;
      }
    >({
      query: ({
        jobId,
        laneName,
        page = 1,
        limit = LANE_PAGE_SIZE,
        cursor,
        filter,
        sortBy,
        sortOrder,
        laneSort,
      }) => {
        const params = new URLSearchParams({
          lanes: laneName.toLowerCase(),
          limit: String(limit),
        });
        if (cursor && String(cursor).trim()) {
          params.set('cursor', String(cursor));
        } else {
          params.set('page', String(page));
        }
        if (filter && Object.keys(filter).length > 0) {
          params.set('filter', JSON.stringify(filter));
        }
        const defaultSortBy = 'tracking.createdAt';
        const defaultSortOrder = 'desc';
        if (sortBy && sortBy !== defaultSortBy) params.set('sortBy', sortBy);
        if (sortOrder && sortOrder !== defaultSortOrder)
          params.set('sortOrder', sortOrder);
        if (laneSort && Object.keys(laneSort).length > 0) {
          params.set('laneSort', JSON.stringify(laneSort));
        }
        return `/jobs/${jobId}/candidates?${params.toString()}`;
      },
      providesTags: ['Candidate'],
    }),
    /**
     * Fetch candidate by ID
     *
     * Note: The response includes `status` as a lane name string if populated,
     * otherwise it may be an ObjectId. The backend populates status when available.
     */
    fetchCandidateById: builder.query<Candidate, string>({
      query: (candidateId) => `/candidates/${candidateId}`,
      providesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    fetchAssignments: builder.query<
      [
        {
          data: Candidate[];
          totalInterviews: number;
          todaysInterviews: number;
          thisweeksInterviews: number;
          assignmentCount: InterviewerAssignmentCountEntry[];
        },
      ],
      {
        isPagination?: boolean;
        page?: number;
        limit?: number;
        filterValue?: string;
        assignedTo?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        /** Extra offset to add to skip, used to compensate for SSE-added items */
        sseOffset?: number;
      }
    >({
      query: ({
        isPagination = true,
        page = 1,
        limit = 10,
        filterValue = '',
        assignedTo = '',
        sortBy = 'assignment.time',
        sortOrder = 'asc',
        sseOffset = 0,
      }) => {
        const params = new URLSearchParams({
          isPagination: String(isPagination),
          page: String(page),
          limit: String(limit),
          filterValue,
          assignedTo,
          sortBy,
          sortOrder,
          sseOffset: String(sseOffset),
        });
        return `/candidates/assignments?${params.toString()}`;
      },
      // providesTags: ['Candidate'],
    }),
    refetchCandidate: builder.mutation<Candidate, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}`,
        method: 'GET',
      }),
      // invalidatesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    fetchCandidateHistory: builder.query<
      { history: ICandidateHistory[] },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/history`,
      providesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    fetchCandidateDetails: builder.query<
      {
        _id: string;
        resume: Candidate['resume'];
        attachments: Candidate['attachments'];
        remarks: Candidate['remarks'];
      },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/details`,
      providesTags: (_result, _error, id) => [{ type: 'Candidate', id }],
    }),
    createCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (body) => ({
        url: '/candidates',
        method: 'POST',
        body: { ...body, dateTime: new Date().toISOString() },
      }),
      // Keep full invalidation for create - new candidate needs to appear in lists
      invalidatesTags: (result, error) =>
        result && !error
          ? ['Candidate', { type: 'Candidate', id: result._id }]
          : [],
    }),
    createGuestCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (newCandidate) => ({
        url: '/candidates/guest-apply',
        method: 'POST',
        body: { ...newCandidate, dateTime: new Date().toISOString() },
      }),
      // invalidatesTags: (result, error) => result && !error ? ['Candidate', { type: 'Candidate', id: result._id }] : [],
    }),
    // Replace your updateCandidate mutation with this:
    updateCandidate: builder.mutation<Candidate, Partial<Candidate>>({
      query: (body) => ({
        url: `/candidates/${body._id}`,
        method: 'PUT',
        body: { ...body, dateTime: new Date().toISOString() },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedCandidate } = await queryFulfilled;
          const candidateId = updatedCandidate?._id ?? arg._id;
          if (!candidateId) return;

          // Same evaluate API used by the manual re-evaluate button
          void dispatch(
            candidateApi.endpoints.evaluateCandidate.initiate({ candidateId }),
          );
        } catch {
          /* update failed — skip auto re-evaluation */
        }
      },
      invalidatesTags: (_result, _error, candidate) =>
        candidate?._id ? [{ type: 'Candidate', id: candidate._id }] : [],
    }),

    fetchAppliedApplication: builder.query({
      query: () => ({
        url: '/candidates/apply-application',
        method: 'GET',
      }),
      providesTags: ['CandidateApplication'],
    }),
    updateAppliedApplication: builder.mutation({
      query: ({ id }) => ({
        url: `/candidates/apply-application?jobid=${id}`,
        method: 'POST',
      }),
      invalidatesTags: ['CandidateApplication'],
    }),

    /**
     * Fetches assigned candidates along with assignment statistics and interviewer mapping.
     * Supports date range filtering for calendar views.
     *
     * The returned data structure:
     * {
     *   data: CandidateAssignmentWithExtras[];
     *   totalInterviews: number;
     *   todaysInterviews: number;
     *   thisweeksInterviews: number;
     *   assignmentCount: InterviewerAssignmentCountEntry[];
     *   dateRange?: { startDate: string; endDate: string; view: string };
     * }
     */
    fetchAssignedCandidates: builder.query<
      [
        {
          data: Candidate[];
          totalInterviews: number;
          todaysInterviews: number;
          thisweeksInterviews: number;
          assignmentCount: InterviewerAssignmentCountEntry[];
          dateRange?: {
            startDate: string;
            endDate: string;
            view: string;
          };
        },
      ],
      {
        startDate?: string;
        endDate?: string;
        view?: 'month' | 'week' | 'day' | 'agenda';
        filterValue?: string;
      } | void
    >({
      query: (params) => {
        if (!params) return '/candidates/assignments';
        const { startDate, endDate, view, filterValue } = params;
        const searchParams = new URLSearchParams();
        if (startDate) searchParams.set('startDate', startDate);
        if (endDate) searchParams.set('endDate', endDate);
        if (view) searchParams.set('view', view);
        if (filterValue) searchParams.set('filterValue', filterValue);
        const queryString = searchParams.toString();
        return queryString
          ? `/candidates/assignments?${queryString}`
          : '/candidates/assignments';
      },
      providesTags: ['Candidate'],
    }),
    /**
     * Filter candidates with pagination
     *
     * Note: The response includes candidates with `status` as a lane name string
     * (e.g., "applied", "screening"), not an ObjectId. This matches the backend
     * aggregation pipeline that resolves Lane ObjectIds to lane names.
     */
    filterCandidates: builder.query<
      { candidates: Candidate[]; totalCount: number },
      {
        page: number;
        limit: number;
        [key: string]: unknown;
      }
    >({
      query: (data) => ({
        url: `/candidates/filter?page=${data.page}&limit=${data.limit}`,
        method: 'POST',
        body: data,
      }),
      providesTags: ['Candidate'],
    }),
    updateCandidateHistory: builder.mutation<
      ICandidateHistory[],
      {
        jobId:
          | string
          | null
          | { _id: string; title: string; description: string };
        candidateId: string;
        newEntry: ICandidateHistory;
      }
    >({
      query: ({ jobId, candidateId, newEntry }) => ({
        url: '/candidates/history',
        method: 'PUT',
        body: {
          jobId,
          candidateId,
          newEntry,
          dateTime: new Date().toISOString(),
        },
      }),
      // Invalidate candidate details after history updates
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
      ],
    }),
    updateCandidateRemark: builder.mutation<void, UpdateRemarkRequest>({
      query: (data) => ({
        url: '/candidates/history',
        method: 'PATCH',
        body: data,
      }),
      // OPTIMIZED: Only invalidate specific candidate's remarks
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Candidate', id }],
    }),
    generateCandidatePdf: builder.mutation<Blob, ShareCandidateRequest>({
      query: (data) => ({
        url: '/candidates/share-pdf',
        method: 'POST',
        body: data,
        responseHandler: (response) => response.blob(),
      }),
    }),
    evaluateCandidate: builder.mutation<
      EvaluateCandidateResponse,
      {
        candidateId: string;
      }
    >({
      queryFn: async ({ candidateId }, api, _extraOptions, baseQuery) => {
        const evaluateArgs = {
          url: '/candidates/evaluate',
          method: 'PUT' as const,
          body: { candidateId },
        };

        const evaluateResult = await baseQuery(evaluateArgs);
        if (evaluateResult.error) {
          return { error: evaluateResult.error };
        }

        const evaluateData = (evaluateResult.data || {
          message: 'Candidate scores updated successfully',
        }) as EvaluateCandidateResponse;

        const state = api.getState() as {
          auth?: { user?: { role?: string } };
        };
        const role = state?.auth?.user?.role?.toLowerCase();
        const isAdminOrHr = role === 'admin' || role === 'hr';

        // Admin/HR expect candidate score payload. If missing (typically due
        // to expired access token), fetch candidate once to recover scores.
        if (isAdminOrHr && !evaluateData.candidate) {
          const candidateResult = await baseQuery({
            url: `/candidates/${candidateId}`,
            method: 'GET',
          });

          if (!candidateResult.error && candidateResult.data) {
            const fetchedCandidate = candidateResult.data as {
              scores?: unknown;
            };
            return {
              data: {
                ...evaluateData,
                candidate: fetchedCandidate?.scores || fetchedCandidate,
              },
            };
          }
        }

        return { data: evaluateData };
      },
      invalidatesTags: ['Candidate'],
    }),
    deleteCandidate: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: 'DELETE',
        body: {
          dateTime: new Date().toISOString(),
        },
      }),
      // Keep full invalidation for delete - candidate needs to be removed from all views
      invalidatesTags: ['Candidate'],
    }),
    candidateSignup: builder.mutation<AuthResponse, AuthRequest>({
      query: (credentials) => ({
        url: '/candidates/signup',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Candidate'],
    }),
    applicationEventMail: builder.mutation<
      NextResponse,
      {
        candidateId: string;
      }
    >({
      query: ({ candidateId }) => ({
        url: '/candidates/event-mail',
        method: 'POST',
        body: { candidateId },
      }),
      invalidatesTags: ['Candidate'],
    }),
    bulkArchiveCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        skippedCount: number;
        failedCount: number;
      },
      {
        candidateIds: string[];
        action: 'archive' | 'unarchive';
      }
    >({
      query: ({ candidateIds, action }) => ({
        url: '/candidates/bulk-archive',
        method: 'POST',
        body: { candidateIds, action },
      }),
      invalidatesTags: ['Candidate'],
    }),
    bulkAssignCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        failedCount: number;
      },
      {
        candidateIds: string[];
        interviewerId: string;
        time?: string;
      }
    >({
      query: (body) => ({
        url: '/candidates/bulk-assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidate'],
    }),
    bulkUnassignCandidates: builder.mutation<
      {
        success: boolean;
        message: string;
        updatedCount: number;
        skippedCount: number;
        failedCount: number;
      },
      { candidateIds: string[] }
    >({
      query: (body) => ({
        url: '/candidates/bulk-unassign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidate'],
    }),
    /** Unified bulk update: assign, unassign, archive, moveJob, addRemark, addFollowUp, statusUpdate
     * Supports both single operation (backward compatible) and multiple operations array
     */
    bulkUpdateCandidates: builder.mutation<
      BulkUpdateCandidatesMutationResult,
      | import('@/app/api/candidates/bulk-update/types').BulkUpdateParams
      | import('@/app/api/candidates/bulk-update/types').BulkUpdateRequest
    >({
      query: (body) => ({
        url: '/candidates/bulk-update',
        method: 'POST',
        body,
      }),
      /** UI is updated from `candidatesToBroadcast` in `onQueryStarted` only — no list refetch */
      invalidatesTags: () => [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: result } = await queryFulfilled;
          if (!result?.success) return;
          const updates = result.candidatesToBroadcast;
          if (!updates?.length) return;

          const updatesDeduped = dedupeBulkUpdatesByCandidateId(updates);

          const affectedJobIds = new Set(
            updatesDeduped
              .map((c) => extractJobIdFromCandidateForCache(c))
              .filter((id): id is string => Boolean(id)),
          );
          if (affectedJobIds.size === 0) return;

          const state = getState();
          const groupedArgs = candidateApi.util.selectCachedArgsForQuery(
            state,
            'fetchCandidates',
          ) as Array<{
            jobId: string;
            filter?: Record<string, unknown>;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            laneSort?: Record<string, { sortBy: string; sortOrder: number }>;
          }>;

          for (const args of groupedArgs) {
            if (!affectedJobIds.has(args.jobId)) continue;
            dispatch(
              candidateApi.util.updateQueryData(
                'fetchCandidates',
                args,
                (draft) => {
                  applyBulkUpdatesToFetchCandidatesDraft(
                    draft as unknown as FetchCandidatesGroupedDraft,
                    updatesDeduped,
                    args.jobId,
                  );
                },
              ),
            );
          }

          const laneArgs = candidateApi.util.selectCachedArgsForQuery(
            state,
            'fetchLaneCandidates',
          ) as Array<{
            jobId: string;
            laneName: string;
            page?: number;
            limit?: number;
            cursor?: string;
            filter?: Record<string, unknown>;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            laneSort?: Record<string, { sortBy: string; sortOrder: 1 | -1 }>;
          }>;

          for (const args of laneArgs) {
            if (!affectedJobIds.has(args.jobId)) continue;
            dispatch(
              candidateApi.util.updateQueryData(
                'fetchLaneCandidates',
                args,
                (draft) => {
                  applyBulkUpdatesToLaneCandidatesDraft(
                    draft as unknown as FetchLaneCandidatesDraft,
                    updatesDeduped,
                    args.laneName,
                    args.jobId,
                  );
                },
              ),
            );
          }

          const countsArgs = candidateApi.util.selectCachedArgsForQuery(
            state,
            'fetchJobLaneCounts',
          ) as Array<{
            jobId: string;
            filter?: Record<string, unknown>;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
          }>;

          for (const args of countsArgs) {
            if (!affectedJobIds.has(args.jobId)) continue;
            dispatch(
              candidateApi.endpoints.fetchJobLaneCounts.initiate(args, {
                forceRefetch: true,
              }),
            );
          }
        } catch {
          /* mutation failed — cache patch skipped */
        }
      },
    }),
    sendEmailToCandidate: builder.mutation<
      SendEmailToCandidateResponse,
      SendEmailToCandidateRequest
    >({
      query: (emailData) => ({
        url: '/candidates/email',
        method: 'POST',
        body: emailData,
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        'EmailHistory',
      ],
    }),

    getDuplicateCandidates: builder.query<
      DuplicateEntry[],
      { id: string; email: string; organizationId: string }
    >({
      query: ({ id, email, organizationId }) =>
        `/candidates/${id}/duplicates?email=${email}&organizationId=${organizationId}`,
    }),

    uploadFiles: builder.mutation<
      {
        success: boolean;
        files: Array<{
          id: string;
          name: string;
          url: string;
          type: string;
          size: number;
        }>;
        customFields?: Record<
          string,
          Array<{
            id: string;
            name: string;
            url: string;
            type: string;
            size: number;
          }>
        >;
      },
      { formData: FormData; organizationId?: string; jobId?: string }
    >({
      query: ({ formData, organizationId, jobId }) => {
        const params = new URLSearchParams();
        if (organizationId) {
          params.append('organizationId', organizationId);
        } else if (jobId) {
          params.append('jobId', jobId);
        }
        const queryString = params.toString();
        return {
          url: `/files/upload${queryString ? `?${queryString}` : ''}`,
          method: 'POST',
          body: formData,
        };
      },
    }),
    fetchCandidatesTable: builder.query<
      {
        candidates: Candidate[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      },
      {
        jobId: string;
        page?: number;
        limit?: number;
        search?: string;
        logicalOperator?: 'AND' | 'OR';
        status?: string;
        isArchived?: boolean;
        followUp?: boolean;
        hasRemark?: string;
        noticePeriod?: string;
        minSalary?: number;
        maxSalary?: number;
        interviewerId?: string;
        hasAssignment?: string;
        dateRange?: string;
        lastActivity?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      }
    >({
      query: ({ jobId, ...params }) => {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, String(value));
          }
        });
        return `/jobs/${jobId}/candidates/table?${queryParams.toString()}`;
      },
      providesTags: ['Candidate'],
    }),
  }),
});

export const {
  useFetchCandidatesQuery,
  useFetchJobLaneCountsQuery,
  useFetchCandidatesTableQuery,
  useFetchCandidateByIdQuery,
  useFetchAssignmentsQuery,
  useLazyFetchAssignmentsQuery,
  useLazyFetchCandidateByIdQuery,
  useCreateCandidateMutation,
  useCreateGuestCandidateMutation,
  useUpdateCandidateMutation,
  useEvaluateCandidateMutation,
  useFetchAssignedCandidatesQuery,
  useLazyFetchAssignedCandidatesQuery,
  useFetchAppliedApplicationQuery,
  useUpdateAppliedApplicationMutation,
  useUpdateCandidateHistoryMutation,
  useDeleteCandidateMutation,
  useFilterCandidatesQuery,
  useLazyFetchCandidatesQuery,
  useFetchLaneCandidatesQuery,
  useLazyFetchLaneCandidatesQuery,
  useRefetchCandidateMutation,
  useCandidateSignupMutation,
  useApplicationEventMailMutation,
  useBulkArchiveCandidatesMutation,
  useBulkAssignCandidatesMutation,
  useBulkUnassignCandidatesMutation,
  useBulkUpdateCandidatesMutation,
  useLazyFetchCandidateHistoryQuery,
  useLazyFetchCandidateDetailsQuery,
  useUpdateCandidateRemarkMutation,
  useSendEmailToCandidateMutation,
  useGenerateCandidatePdfMutation,
  useGetDuplicateCandidatesQuery,
  useUploadFilesMutation,
} = candidateApi;
