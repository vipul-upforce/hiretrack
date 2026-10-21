import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  Job,
  Organization,
  Lane,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { isValidObjectId, Types } from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import { LANE_PAGE_SIZE } from '@/lib/constants/lanePagination';

const MAX_LIMIT = 200;
const DEFAULT_LANE_PAGE_SIZE = LANE_PAGE_SIZE;
const CURSOR_PARAM_MAX_BYTES = 2048;

type JobFilters = {
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
};

/** Map sortOrder number to 'asc' | 'desc'; falls back to defaultOrder when not 1 or -1 */
function toSortOrder(
  sortOrderNum: number | undefined,
  defaultOrder: 'asc' | 'desc',
): 'asc' | 'desc' {
  if (sortOrderNum === 1) return 'asc';
  if (sortOrderNum === -1) return 'desc';
  return defaultOrder;
}

/** Allowed sort fields for validation */
const ALLOWED_SORT_FIELDS = new Set([
  'name',
  'createdAt',
  'tracking.createdAt',
  'scores.overall',
  'updatedAt',
  'tracking.updatedAt',
  'assignment.assignedAt',
  'experience',
  'expectedCTC',
  'currentCTC',
  'noticePeriod',
]);

type LaneSortEntry = { sortBy: string; sortOrder: number };

function applyJobFiltersToQuery(
  baseQuery: Record<string, unknown>,
  jobFilters: JobFilters,
): void {
  const logicalOperator = jobFilters.logicalOperator || 'AND';
  const searchOrConditions: Array<Record<string, unknown>> = [];
  const filterConditions: Array<Record<string, unknown>> = [];

  if (jobFilters.search) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(jobFilters.search, 'i');
    searchOrConditions.push(
      { name: regex },
      { skills: regex },
      { location: regex },
    );
  }

  if (jobFilters.topCandidates) {
    filterConditions.push({ 'scores.overall': { $gte: 7 } });
  }

  if (jobFilters.assigned) {
    filterConditions.push({
      'assignment.interviewerId': { $exists: true, $ne: null },
    });
  }

  if (jobFilters.notAssigned) {
    filterConditions.push({
      'assignment.interviewerId': { $exists: false },
    });
  }

  if (jobFilters.withRemarks) {
    filterConditions.push({ remarks: { $exists: true, $ne: [] } });
  }

  if (jobFilters.withoutRemarks) {
    filterConditions.push({
      $or: [{ remarks: { $exists: false } }, { remarks: [] }],
    });
  }

  if (jobFilters.appliedThisWeek) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    filterConditions.push({ 'tracking.createdAt': { $gte: oneWeekAgo } });
  }

  if (jobFilters.appliedToday) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    filterConditions.push({
      'tracking.createdAt': { $gte: today, $lt: tomorrow },
    });
  }

  if (jobFilters.appliedIn15Days) {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    filterConditions.push({
      'tracking.createdAt': { $gte: fifteenDaysAgo },
    });
  }

  if (jobFilters.toFollowUp) {
    filterConditions.push({
      'followUp.note': { $exists: true, $nin: [null, ''] },
    });
  }

  const existingAnd = Array.isArray(baseQuery.$and)
    ? (baseQuery.$and as Array<Record<string, unknown>>)
    : [];

  if (logicalOperator === 'OR') {
    const orList: Array<Record<string, unknown>> = [];
    if (searchOrConditions.length > 0) orList.push(...searchOrConditions);
    orList.push(...filterConditions);
    if (orList.length > 0) {
      baseQuery.$and = [...existingAnd, { $or: orList }];
    }
    return;
  }

  const nextAnd: Array<Record<string, unknown>> = [];
  if (searchOrConditions.length > 0) nextAnd.push({ $or: searchOrConditions });
  nextAnd.push(...filterConditions);
  if (nextAnd.length > 0) {
    baseQuery.$and = [...existingAnd, ...nextAnd];
  }
}

type LaneCursorPayload = {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  sortValue: string | number | null;
  id: string;
};

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad =
    base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + pad, 'base64').toString('utf8');
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseLaneCursorFromQuery(
  cursorParam: string | null,
): LaneCursorPayload | null {
  if (!cursorParam || typeof cursorParam !== 'string') return null;
  if (cursorParam.length > CURSOR_PARAM_MAX_BYTES) return null;
  try {
    const decoded = base64UrlDecode(decodeURIComponent(cursorParam));
    const parsed = JSON.parse(decoded) as Partial<LaneCursorPayload>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.sortBy !== 'string' ||
      (parsed.sortOrder !== 'asc' && parsed.sortOrder !== 'desc') ||
      (parsed.sortValue !== null &&
        typeof parsed.sortValue !== 'string' &&
        typeof parsed.sortValue !== 'number') ||
      typeof parsed.id !== 'string'
    ) {
      return null;
    }
    if (!ALLOWED_SORT_FIELDS.has(parsed.sortBy)) return null;
    if (!isValidObjectId(parsed.id)) return null;
    return parsed as LaneCursorPayload;
  } catch {
    return null;
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function encodeLaneCursor(payload: LaneCursorPayload): string {
  return base64UrlEncode(JSON.stringify(payload));
}

function coerceCursorSortValue(
  sortBy: string,
  sortValue: string | number | null,
): string | number | Date | null {
  if (sortValue === null) return null;
  const dateSortFields = new Set([
    'createdAt',
    'updatedAt',
    'tracking.createdAt',
    'tracking.updatedAt',
    'assignment.assignedAt',
  ]);
  const numberSortFields = new Set([
    'scores.overall',
    'experience',
    'expectedCTC',
    'currentCTC',
    'noticePeriod',
  ]);
  if (dateSortFields.has(sortBy)) {
    const d = new Date(
      typeof sortValue === 'number' ? sortValue : String(sortValue),
    );
    return d;
  }
  if (numberSortFields.has(sortBy)) {
    return typeof sortValue === 'number' ? sortValue : Number(sortValue);
  }
  return String(sortValue);
}

function serializeCursorSortValueForPayload(
  sortBy: string,
  sortValue: unknown,
): LaneCursorPayload['sortValue'] {
  if (sortValue == null) return null;
  const dateSortFields = new Set([
    'createdAt',
    'updatedAt',
    'tracking.createdAt',
    'tracking.updatedAt',
    'assignment.assignedAt',
  ]);
  const numberSortFields = new Set([
    'scores.overall',
    'experience',
    'expectedCTC',
    'currentCTC',
    'noticePeriod',
  ]);
  if (dateSortFields.has(sortBy)) {
    const d =
      sortValue instanceof Date ? sortValue : new Date(String(sortValue));
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (numberSortFields.has(sortBy)) {
    if (typeof sortValue === 'number' && Number.isFinite(sortValue))
      return sortValue;
    const n = Number(sortValue);
    return Number.isFinite(n) ? n : null;
  }
  return String(sortValue);
}

function buildNextCursorForCandidates(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  candidates: Array<{ _id: unknown }>,
): string | null {
  if (!candidates.length) return null;

  let cursorCandidate: { _id: unknown } | null = null;

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const candidate = candidates[i] as { _id: unknown };
    const sortFieldValue = getNestedValue(candidate, sortBy);
    if (sortFieldValue != null) {
      cursorCandidate = candidate;
      break;
    }
  }

  if (!cursorCandidate) {
    cursorCandidate = candidates[candidates.length - 1] as { _id: unknown };
  }

  const sortValue = serializeCursorSortValueForPayload(
    sortBy,
    getNestedValue(cursorCandidate, sortBy),
  );

  return encodeLaneCursor({
    sortBy,
    sortOrder,
    sortValue,
    id: String(cursorCandidate._id),
  });
}

/**
 * Parse filter from query param (JSON string). Returns undefined if missing/invalid.
 */
function parseFilterFromQuery(
  filterParam: string | null,
): JobFilters | undefined {
  if (!filterParam || typeof filterParam !== 'string') return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(filterParam)) as Record<
      string,
      unknown
    >;
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const result: JobFilters = {};
    if (typeof parsed.search === 'string') result.search = parsed.search;
    if (parsed.logicalOperator === 'AND' || parsed.logicalOperator === 'OR')
      result.logicalOperator = parsed.logicalOperator;
    if (typeof parsed.topCandidates === 'boolean')
      result.topCandidates = parsed.topCandidates;
    if (typeof parsed.appliedThisWeek === 'boolean')
      result.appliedThisWeek = parsed.appliedThisWeek;
    if (typeof parsed.appliedToday === 'boolean')
      result.appliedToday = parsed.appliedToday;
    if (typeof parsed.appliedIn15Days === 'boolean')
      result.appliedIn15Days = parsed.appliedIn15Days;
    if (typeof parsed.toFollowUp === 'boolean')
      result.toFollowUp = parsed.toFollowUp;
    if (typeof parsed.assigned === 'boolean') result.assigned = parsed.assigned;
    if (typeof parsed.notAssigned === 'boolean')
      result.notAssigned = parsed.notAssigned;
    if (typeof parsed.withRemarks === 'boolean')
      result.withRemarks = parsed.withRemarks;
    if (typeof parsed.withoutRemarks === 'boolean')
      result.withoutRemarks = parsed.withoutRemarks;
    if (typeof parsed.archived === 'boolean') result.archived = parsed.archived;
    return result;
  } catch {
    return undefined;
  }
}

/**
 * Parse laneSort from query param (JSON: Record<laneName, { sortBy, sortOrder }>).
 */
function parseLaneSortFromQuery(
  laneSortParam: string | null,
): Record<string, LaneSortEntry> | undefined {
  if (!laneSortParam || typeof laneSortParam !== 'string') return undefined;
  try {
    const parsed = JSON.parse(decodeURIComponent(laneSortParam)) as Record<
      string,
      { sortBy?: string; sortOrder?: number }
    >;
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const result: Record<string, LaneSortEntry> = {};
    for (const [laneName, entry] of Object.entries(parsed)) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof entry.sortBy === 'string' &&
        ALLOWED_SORT_FIELDS.has(entry.sortBy) &&
        (entry.sortOrder === 1 || entry.sortOrder === -1)
      ) {
        result[laneName] = {
          sortBy: entry.sortBy,
          sortOrder: entry.sortOrder,
        };
      }
    }
    return result;
  } catch {
    return undefined;
  }
}

/**
 * Helper function to extract active filters as an array
 */
function getActiveFilters(filters?: JobFilters): string[] {
  if (!filters) return [];
  const activeFilters: string[] = [];
  if (filters.search) activeFilters.push('search');
  if (filters.topCandidates) activeFilters.push('topCandidates');
  if (filters.assigned) activeFilters.push('assigned');
  if (filters.notAssigned) activeFilters.push('notAssigned');
  if (filters.withRemarks) activeFilters.push('withRemarks');
  if (filters.withoutRemarks) activeFilters.push('withoutRemarks');
  if (filters.appliedThisWeek) activeFilters.push('appliedThisWeek');
  if (filters.appliedToday) activeFilters.push('appliedToday');
  if (filters.appliedIn15Days) activeFilters.push('appliedIn15Days');
  if (filters.toFollowUp) activeFilters.push('toFollowUp');
  if (filters.archived) activeFilters.push('archived');
  return activeFilters;
}

/**
 * Resolve effective lanes for a job
 * Returns custom lanes if job uses them, otherwise organization/default lanes
 * Uses Job.getEffectiveLanes() which returns Lane objects
 */
async function resolveEffectiveLanes(
  jobId: string,
  organizationId: string,
): Promise<{
  lanes: Array<{
    _id: Types.ObjectId;
    name: string;
    color?: string;
    order: number;
  }>;
  useCustomLanes: boolean;
}> {
  if (!Job) {
    throw new Error('Database models not available');
  }
  // Call static method on Job model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (Job as any).getEffectiveLanes(jobId, organizationId);
  if (!result) {
    throw new Error('Job not found');
  }

  return result;
}

/**
 * Get counts per lane using aggregation (fast, even for 100K+ candidates)
 * Groups by status ObjectId, then maps to lane names
 * Applies job filters if provided to ensure counts match filtered candidates
 */
async function getLaneCounts(
  jobId: string,
  organizationId: string,
  includeArchived: boolean,
  jobFilters?: JobFilters,
): Promise<Record<string, number>> {
  if (!Candidate || !Lane) {
    throw new Error('Database models not available');
  }

  // Convert jobId string to ObjectId for aggregation
  const jobObjectId = new Types.ObjectId(jobId);

  const matchStage: Record<string, unknown> = {
    jobId: jobObjectId,
    organizationId,
  };

  if (includeArchived) {
    matchStage.isDeleted = true;
  } else {
    matchStage.isDeleted = { $ne: true };
  }

  // Apply job-level filters to matchStage (same logic as getCandidates)
  if (jobFilters) {
    applyJobFiltersToQuery(matchStage, jobFilters);
  }

  // Group by status ObjectId (status is now a reference to Lane)
  const counts = await Candidate.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status', // status is now ObjectId
        count: { $sum: 1 },
      },
    },
  ]);

  // Get lane names for the status ObjectIds
  const laneIds = counts
    .map((item) => item._id)
    .filter((id) => id !== null && id !== undefined);

  if (laneIds.length === 0) {
    return {};
  }

  // Fetch Lane documents to get names
  // Lanes can be either organization-level (jobId: null) or job-specific (jobId: jobId)
  const lanes = await Lane.find({
    _id: { $in: laneIds },
    organizationId,
    $or: [
      { jobId: jobObjectId }, // Job-specific lanes
      { jobId: null }, // Organization-level lanes
    ],
  })
    .select('_id name')
    .lean()
    .exec();

  // Create map: laneId -> laneName
  const laneMap = new Map(
    lanes.map((lane) => [lane._id.toString(), lane.name]),
  );

  // Convert counts to use lane names as keys
  const countsMap: Record<string, number> = {};
  counts.forEach((item) => {
    if (item._id) {
      const laneName = laneMap.get(item._id.toString()) || 'unknown';
      countsMap[laneName] = item.count;
    }
  });

  return countsMap;
}

function buildCandidatesAggregationPipeline({
  query,
  sortBy,
  sortOrder,
  skip,
  limit,
  isInterviewer,
}: {
  query: Record<string, unknown>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  skip: number;
  limit: number;
  isInterviewer: boolean;
}) {
  // Narrow sort values to 1 | -1 so the pipeline satisfies PipelineStage.Sort
  const sortDir: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
  const sortFieldPath = `$${sortBy}`;
  const sortMissingDir = 1 as const;
  const sortStage = {
    $sort: {
      __sortMissing: sortMissingDir,
      [sortBy]: sortDir,
      _id: sortDir,
    },
  } as const;

  const baseProject: Record<string, 0 | 1> = {
    assignmentInterviewer: 0,
    remarksUsers: 0,
    followUpUser: 0,
    jobData: 0,
    statusData: 0,
    duplicateInfo: 0,
  };

  if (isInterviewer) {
    baseProject.currentCTC = 0;
    baseProject.expectedCTC = 0;
    baseProject.customFields = 0;
  }

  return [
    { $match: query },
    // Ensure candidates missing the sort field always appear LAST,
    // regardless of sortOrder, by sorting first on a synthetic
    // "__sortMissing" flag and then on the actual sortBy field.
    {
      $addFields: {
        __sortMissing: {
          // "missing" catches field-not-present; "null" catches explicit null.
          // Avoid `$not: [value]` because it treats 0/false/"" as missing.
          $cond: [{ $in: [{ $type: sortFieldPath }, ['missing', 'null']] }, 1, 0],
        },
      },
    },
    sortStage,
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'assignment.interviewerId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
        as: 'assignmentInterviewer',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'remarks.userId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
        as: 'remarksUsers',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'followUp.userId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
        as: 'followUpUser',
      },
    },
    {
      $lookup: {
        from: 'jobs',
        localField: 'jobId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, title: 1, description: 1 } }],
        as: 'jobData',
      },
    },
    {
      $lookup: {
        from: 'lanes',
        localField: 'status',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 0, name: 1 } }],
        as: 'statusData',
      },
    },
    {
      $lookup: {
        from: 'duplicatecandidates',
        let: {
          candidateEmail: { $toLower: { $trim: { input: '$email' } } },
          orgId: { $toObjectId: '$organizationId' },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$email', '$$candidateEmail'] },
                  { $eq: ['$orgId', '$$orgId'] },
                ],
              },
            },
          },
          { $project: { count: { $size: '$duplicates' } } },
        ],
        as: 'duplicateInfo',
      },
    },
    {
      $addFields: {
        duplicateCount: {
          $ifNull: [{ $arrayElemAt: ['$duplicateInfo.count', 0] }, 0],
        },
      },
    },

    {
      $set: {
        assignment: {
          $cond: {
            if: { $ifNull: ['$assignment.interviewerId', false] },
            then: {
              $mergeObjects: [
                '$assignment',
                { interviewerId: { $first: '$assignmentInterviewer' } },
              ],
            },
            else: null,
          },
        },
        remarks: {
          $map: {
            input: { $ifNull: ['$remarks', []] },
            as: 'remark',
            in: {
              $mergeObjects: [
                '$$remark',
                {
                  userId: {
                    $let: {
                      vars: {
                        matchedUser: {
                          $first: {
                            $filter: {
                              input: '$remarksUsers',
                              as: 'user',
                              cond: { $eq: ['$$user._id', '$$remark.userId'] },
                            },
                          },
                        },
                      },
                      in: '$$matchedUser',
                    },
                  },
                },
              ],
            },
          },
        },
        remarksCount: { $size: { $ifNull: ['$remarks', []] } },
        followUp: {
          $cond: [
            { $ifNull: ['$followUp', false] },
            {
              $mergeObjects: [
                '$followUp',
                { userId: { $first: '$followUpUser' } },
              ],
            },
            '$followUp',
          ],
        },
        jobId: { $first: '$jobData' },
        status: {
          $let: {
            vars: {
              statusObj: { $first: '$statusData' },
            },
            in: {
              $cond: [
                { $ifNull: ['$$statusObj', false] },
                '$$statusObj.name',
                null, // Fallback if no lane found
              ],
            },
          },
        },
        // Ensure duplicateCount is always included (from $addFields stage above)
        duplicateCount: {
          $ifNull: ['$duplicateCount', 0],
        },
      },
    },
    { $project: { ...baseProject, __sortMissing: 0 } },
  ];
}

/**
 * Get candidates with pagination and filtering
 * lanes parameter can be either lane names (string[]) or Lane objects
 * Uses lane-specific sorting from job.laneConfigs if available
 */
async function getCandidates(
  jobId: string,
  organizationId: string,
  options: {
    lanes?: string[] | Array<{ _id: Types.ObjectId; name: string }>;
    page: number;
    limit: number;
    cursor?: LaneCursorPayload | null;
    sortBy?: string; // Optional - will use laneConfig if not provided
    sortOrder?: 'asc' | 'desc'; // Optional - will use laneConfig if not provided
    includeArchived: boolean;
    laneConfig?: {
      sortBy: string;
      sortOrder: 1 | -1; // -1 for desc, 1 for asc
    };
    jobFilters?: JobFilters;
    isInterviewer: boolean;
  },
) {
  if (!Candidate || !Lane) {
    throw new Error('Database models not available');
  }

  const {
    lanes,
    page,
    limit,
    cursor,
    sortBy: providedSortBy,
    sortOrder: providedSortOrder,
    includeArchived,
    laneConfig,
    jobFilters,
    isInterviewer,
  } = options;

  // Convert jobId to ObjectId for queries
  const jobObjectId = new Types.ObjectId(jobId);

  // Build query
  const query: Record<string, unknown> = {
    jobId: jobObjectId,
    organizationId,
  };

  // Filter by lanes if provided
  // lanes can be lane names (string[]) or Lane objects
  if (lanes && lanes.length > 0) {
    // Check if lanes are strings (lane names) or objects (Lane objects)
    const isLaneObjects = lanes.some(
      (lane) => typeof lane === 'object' && lane !== null,
    );
    if (isLaneObjects) {
      // Extract ObjectIds from Lane objects
      const laneIds = (lanes as Array<{ _id: Types.ObjectId }>).map(
        (lane) => lane._id,
      );
      query.status = { $in: laneIds };
    } else {
      // Convert lane names to Lane ObjectIds
      // First try job-specific lanes, then fall back to organization-level lanes
      const laneNames = lanes as string[];

      // Try to find job-specific lanes first
      let laneDocuments = await Lane.find({
        name: { $in: laneNames },
        organizationId,
        jobId: jobObjectId, // Job-specific lanes
        isActive: true,
      })
        .select('_id name')
        .lean()
        .exec();

      // If not all lanes found as job-specific, check organization-level lanes
      const foundLaneNames = new Set(laneDocuments.map((l) => l.name));
      const missingLaneNames = laneNames.filter(
        (name) => !foundLaneNames.has(name),
      );

      if (missingLaneNames.length > 0) {
        const orgLaneDocuments = await Lane.find({
          name: { $in: missingLaneNames },
          organizationId,
          jobId: null, // Organization-level lanes
          isActive: true,
        })
          .select('_id name')
          .lean()
          .exec();

        laneDocuments = [...laneDocuments, ...orgLaneDocuments];
      }

      const laneIds = laneDocuments.map((lane) => lane._id);
      query.status = { $in: laneIds };
    }
  }

  // Apply job filters if provided
  if (jobFilters) {
    applyJobFiltersToQuery(query, jobFilters);
  }

  // Handle archived candidates
  if (includeArchived) {
    query.isDeleted = true;
  } else {
    query.isDeleted = { $ne: true };
  }

  // Determine effective sorting (laneConfig can override defaults when present)
  const sortBy =
    providedSortBy || laneConfig?.sortBy || 'tracking.createdAt';
  let sortOrder: 'asc' | 'desc';
  if (providedSortOrder) {
    sortOrder = providedSortOrder;
  } else if (laneConfig) {
    sortOrder = laneConfig.sortOrder === 1 ? 'asc' : 'desc';
  } else {
    sortOrder = 'desc';
  }

  // Cursor pagination: if cursor is present and matches current sort, page becomes a client-side chunk number only.
  // We compute hasNextPage by fetching limit+1 and returning only limit.
  if (cursor && cursor.sortBy === sortBy && cursor.sortOrder === sortOrder) {
    const totalForLane = await Candidate.countDocuments(query);
    const cursorId = new Types.ObjectId(cursor.id);
    const cursorValue = coerceCursorSortValue(sortBy, cursor.sortValue);
    if (
      cursorValue instanceof Date &&
      !Number.isFinite(cursorValue.getTime())
    ) {
      throw new Error('Invalid cursor sortValue');
    }
    if (typeof cursorValue === 'number' && !Number.isFinite(cursorValue)) {
      throw new Error('Invalid cursor sortValue');
    }

    // Do not overwrite existing `$or` (used by search / OR filters). Add cursor condition via `$and`.
    let cursorPredicate: Record<string, unknown>;

    if (cursorValue === null) {
      // We are in the "null / missing sort field" band.
      // Continue pagination only within documents that have null/missing sortBy,
      // ordered by _id as a tiebreaker in the same direction as the request sort.
      const idComparator = sortOrder === 'asc' ? '$gt' : '$lt';
      cursorPredicate = {
        $or: [
          { [sortBy]: null, _id: { [idComparator]: cursorId } },
          { [sortBy]: { $exists: false }, _id: { [idComparator]: cursorId } },
        ],
      };
    } else {
      // Non-null sortValue: page through in the same direction as sortOrder.
      // For asc: (value > cursorValue) OR (value === cursorValue AND _id > cursorId)
      // For desc: (value < cursorValue) OR (value === cursorValue AND _id < cursorId)
      //
      // Important: also include the "missing sort field" band so those documents
      // are still returned after all non-missing documents have been paged.
      cursorPredicate =
        sortOrder === 'asc'
          ? {
              $or: [
                { [sortBy]: { $gt: cursorValue } },
                { [sortBy]: cursorValue, _id: { $gt: cursorId } },
                { [sortBy]: null },
                { [sortBy]: { $exists: false } },
              ],
            }
          : {
              $or: [
                { [sortBy]: { $lt: cursorValue } },
                { [sortBy]: cursorValue, _id: { $lt: cursorId } },
                { [sortBy]: null },
                { [sortBy]: { $exists: false } },
              ],
            };
    }
    const andList = Array.isArray(query.$and) ? (query.$and as unknown[]) : [];
    query.$and = [...andList, cursorPredicate];

    const raw = await Candidate.aggregate(
      buildCandidatesAggregationPipeline({
        query,
        sortBy,
        sortOrder,
        skip: 0,
        limit: limit + 1,
        isInterviewer,
      }),
    );
    const hasNextPage = raw.length > limit;
    const candidates = hasNextPage ? raw.slice(0, limit) : raw;
    const nextCursor = buildNextCursorForCandidates(
      sortBy,
      sortOrder,
      candidates as Array<{ _id: unknown }>,
    );
    return {
      candidates,
      pagination: {
        page,
        limit,
        total: totalForLane,
        totalPages: Math.ceil(totalForLane / limit),
        hasNextPage,
        hasPreviousPage: true,
      },
      pageInfo: {
        hasNextPage,
        nextCursor,
      },
    };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;

  const [candidates, total] = await Promise.all([
    Candidate.aggregate(
      buildCandidatesAggregationPipeline({
        query,
        sortBy,
        sortOrder,
        skip,
        limit,
        isInterviewer,
      }),
    ),
    Candidate.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    candidates,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    pageInfo: {
      hasNextPage: page < totalPages,
      nextCursor: buildNextCursorForCandidates(
        sortBy,
        sortOrder,
        candidates as Array<{ _id: unknown }>,
      ),
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Resolve params and authenticate in parallel
    const [{ id: jobId }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(request, ['interviewer', 'admin', 'hr']),
    ]);

    // Handle authentication errors
    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    // Validate job ID
    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    if (!isValidObjectId(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 },
      );
    }

    // Connect to database
    await connectToDatabase();

    if (!Candidate || !Job || !Organization) {
      return NextResponse.json(
        { error: 'Database models not available' },
        { status: 500 },
      );
    }

    // Parse query parameters (filter and sort are client-side, passed as query params)
    const { searchParams } = new URL(request.url);
    const jobFilters = parseFilterFromQuery(searchParams.get('filter'));
    const sortByParam = searchParams.get('sortBy') || 'tracking.createdAt';
    const sortOrderParam = (searchParams.get('sortOrder') || 'desc') as
      | 'asc'
      | 'desc';
    const laneSortMap = parseLaneSortFromQuery(searchParams.get('laneSort'));
    const includeArchived = jobFilters?.archived === true;
    const countsOnly = searchParams.get('countsOnly') === 'true';

    if (countsOnly) {
      const { lanes: effectiveLanes, useCustomLanes } =
        await resolveEffectiveLanes(jobId, userData.organizationId);
      const effectiveLaneNames = effectiveLanes.map((lane) => lane.name);

      const laneCounts = await getLaneCounts(
        jobId,
        userData.organizationId,
        includeArchived,
        jobFilters,
      );
      const unfilteredLaneCounts = await getLaneCounts(
        jobId,
        userData.organizationId,
        false,
        undefined,
      );
      const archivedLaneCounts = await getLaneCounts(
        jobId,
        userData.organizationId,
        true,
        undefined,
      );

      const lanesData: Record<string, { count: number }> = {};
      for (const lane of effectiveLanes) {
        const laneName = lane.name;
        lanesData[laneName] = { count: laneCounts[laneName] ?? 0 };
      }

      const laneMapping: Record<string, string> = {};
      effectiveLanes.forEach((lane) => {
        laneMapping[lane.name] = lane._id.toString();
      });

      const jobActiveFilters = getActiveFilters(jobFilters);
      const filteredTotal = Object.values(laneCounts).reduce(
        (sum, count) => sum + count,
        0,
      );
      const unfilteredNonArchivedTotal = Object.values(
        unfilteredLaneCounts,
      ).reduce((sum, count) => sum + count, 0);
      const archivedTotal = Object.values(archivedLaneCounts).reduce(
        (sum, count) => sum + count,
        0,
      );
      const totalAllCandidates = unfilteredNonArchivedTotal + archivedTotal;

      return NextResponse.json({
        lanes: lanesData,
        meta: {
          jobId,
          useCustomLanes,
          availableLanes: effectiveLaneNames,
          laneMapping,
          totalCandidates: totalAllCandidates,
          totalCandidatesUnfiltered: unfilteredNonArchivedTotal,
          totalCandidatesFiltered: filteredTotal,
          filters: jobActiveFilters,
          filter: jobFilters ?? {},
        },
      });
    }

    const lanePageSizeParam = searchParams.get('lanePageSize');
    const lanesParam = searchParams.get('lanes');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const cursorParam = searchParams.get('cursor');

    // Parse requested lanes once for both branch detection and lane-pagination handling
    const requestedLanes = lanesParam
      ? lanesParam
          .split(',')
          .map((lane) => lane.trim().toLowerCase())
          .filter(Boolean)
      : [];

    // Default sort (used when no per-lane sort)
    const sortBy = ALLOWED_SORT_FIELDS.has(sortByParam)
      ? sortByParam
      : 'tracking.createdAt';
    const sortOrder = sortOrderParam;

    // Check if this is a request for a specific lane with pagination (for lazy loading / "load more")
    // Format: ?lanes=rejected&page=2&limit=5 — single lane + page (limit optional)
    // When lanePageSize is present we're in "grouped" mode (first page of all lanes); when only lanes+page+limit we're loading one lane's page
    const isLanePaginationRequest =
      requestedLanes.length === 1 && pageParam != null;
    const isLaneCursorPaginationRequest =
      requestedLanes.length === 1 && cursorParam != null;

    if (isLanePaginationRequest || isLaneCursorPaginationRequest) {
      // Handle per-lane pagination request (for loading more candidates in a lane)
      const page = pageParam ? parseInt(pageParam, 10) || 1 : 1;
      const limit = limitParam
        ? Math.min(parseInt(limitParam, 10), MAX_LIMIT)
        : DEFAULT_LANE_PAGE_SIZE;
      const cursor = parseLaneCursorFromQuery(cursorParam);
      if (page < 1) {
        return NextResponse.json(
          { error: 'Page must be greater than 0' },
          { status: 400 },
        );
      }

      // Resolve effective lanes to validate and get lane config
      const { lanes: effectiveLanes } = await resolveEffectiveLanes(
        jobId,
        userData.organizationId,
      );
      // Extract lane names from Lane objects
      const effectiveLaneNames = effectiveLanes.map((lane) => lane.name);

      if (!effectiveLaneNames.includes(requestedLanes[0])) {
        return NextResponse.json(
          {
            error: `Invalid lane: ${requestedLanes[0]}`,
            validLanes: effectiveLaneNames,
          },
          { status: 400 },
        );
      }

      // Get lane-specific sort from query param (client-side laneSort), else use global
      const laneSortEntry = laneSortMap?.[requestedLanes[0]];
      const laneSortByBase = laneSortEntry?.sortBy ?? sortBy;
      const laneSortOrderBase = toSortOrder(
        laneSortEntry?.sortOrder,
        sortOrder,
      );
      const cursorMode = cursorParam != null;

      if (cursorMode && !cursor) {
        return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
      }

      // Effective sort for this lane request.
      // If a cursor is present and its sort differs from laneSort, trust the cursor
      // (server is source of truth) instead of throwing an error.
      let laneSortBy = laneSortByBase;
      let laneSortOrder = laneSortOrderBase;

      if (cursorMode && cursor) {
        if (
          cursor.sortBy !== laneSortByBase ||
          cursor.sortOrder !== laneSortOrderBase
        ) {
          logger.warn(
            {
              event: 'cursorSortMismatch',
              jobId,
              lane: requestedLanes[0],
              laneSortBy: laneSortByBase,
              laneSortOrder: laneSortOrderBase,
              cursorSortBy: cursor.sortBy,
              cursorSortOrder: cursor.sortOrder,
            },
            'Cursor sort does not match lane sort; using cursor sort as source of truth',
          );
          laneSortBy = cursor.sortBy;
          laneSortOrder = cursor.sortOrder;
        }

        logger.info(
          {
            event: 'cursorRequest',
            jobId,
            lane: requestedLanes[0],
            limit,
            sortBy: laneSortBy,
            sortOrder: laneSortOrder,
          },
          'Lane candidates cursor request',
        );
      }

      // Get active filters array
      const activeFilters = getActiveFilters(jobFilters);

      const isInterviewer = userData?.role === 'interviewer';

      // Get counts for the requested lane (with filters applied)
      const laneCounts = await getLaneCounts(
        jobId,
        userData.organizationId,
        includeArchived,
        jobFilters,
      );

      // Get unfiltered total counts (without filters), excluding archived
      const unfilteredLaneCounts = await getLaneCounts(
        jobId,
        userData.organizationId,
        false,
        undefined, // No filters
      );
      // Get archived-only counts (without filters)
      const archivedLaneCounts = await getLaneCounts(
        jobId,
        userData.organizationId,
        true,
        undefined, // No filters
      );

      // Fetch candidates for the specific lane and page with lane-specific sorting
      const { candidates, pagination, pageInfo } = await getCandidates(
        jobId,
        userData.organizationId,
        {
          lanes: requestedLanes,
          page,
          limit,
          cursor,
          sortBy: laneSortBy,
          sortOrder: laneSortOrder,
          includeArchived,
          laneConfig: laneSortEntry
            ? {
                sortBy: laneSortEntry.sortBy,
                sortOrder: laneSortEntry.sortOrder as 1 | -1,
              }
            : undefined,
          jobFilters,
          isInterviewer,
        },
      );

      if (cursorMode) {
        logger.info(
          {
            event: 'cursorResponse',
            jobId,
            lane: requestedLanes[0],
            returnedCount: candidates.length,
            hasNextPage: pageInfo.hasNextPage,
          },
          'Lane candidates cursor response',
        );
      }

      const filteredTotal = laneCounts[requestedLanes[0]] || 0;
      const unfilteredNonArchivedTotal =
        unfilteredLaneCounts[requestedLanes[0]] || 0;
      const archivedTotal = archivedLaneCounts[requestedLanes[0]] || 0;
      const totalAllCandidates = unfilteredNonArchivedTotal + archivedTotal;

      return NextResponse.json({
        candidates,
        pagination,
        pageInfo,
        sorting: {
          sortBy: laneSortBy,
          sortOrder: laneSortOrder,
        },
        filters: activeFilters,
        meta: {
          jobId,
          lane: requestedLanes[0],
          totalCandidates: totalAllCandidates, // All candidates (archived + active)
          totalCandidatesUnfiltered: unfilteredNonArchivedTotal, // Unfiltered, excluding archived
          totalCandidatesFiltered: filteredTotal, // Filtered total for this lane
        },
      });
    }

    // Always use grouped by lane mode with default page size of 50
    const lanePageSize = lanePageSizeParam
      ? Math.min(parseInt(lanePageSizeParam, 10), MAX_LIMIT)
      : DEFAULT_LANE_PAGE_SIZE;

    // Resolve effective lanes (returns Lane objects with config)
    const { lanes: effectiveLanes, useCustomLanes } =
      await resolveEffectiveLanes(jobId, userData.organizationId);
    // Extract lane names for iteration and response
    const effectiveLaneNames = effectiveLanes.map((lane) => lane.name);
    const isInterviewer = userData?.role === 'interviewer';

    // Validate lanePageSize
    if (lanePageSize <= 0) {
      return NextResponse.json(
        {
          error: 'lanePageSize must be greater than 0',
        },
        { status: 400 },
      );
    }

    // Always return grouped by lane response with pagination per lane
    // Default: 50 candidates per lane (prevents fetching all candidates)
    // Same response structure always - no different modes

    // Get counts first (with filters applied)
    const laneCounts = await getLaneCounts(
      jobId,
      userData.organizationId,
      includeArchived,
      jobFilters,
    );

    // Get unfiltered total counts (without filters), excluding archived
    const unfilteredLaneCounts = await getLaneCounts(
      jobId,
      userData.organizationId,
      false,
      undefined, // No filters
    );
    // Get archived-only counts (without filters)
    const archivedLaneCounts = await getLaneCounts(
      jobId,
      userData.organizationId,
      true,
      undefined, // No filters
    );

    // Fetch first page of candidates for each lane
    // CRITICAL: Preserve exact order from effectiveLanes - do not reorder
    const lanesData: Record<
      string,
      {
        candidates: unknown[];
        count: number;
        hasMore: boolean;
        page: number;
        totalPages: number;
        pageInfo: {
          hasNextPage: boolean;
          nextCursor: string | null;
        };
        sorting: {
          sortBy: string;
          sortOrder: 'asc' | 'desc';
        };
        filters: string[];
      }
    > = {};

    // Iterate in exact order of effectiveLanes to preserve lane order
    for (const lane of effectiveLanes) {
      const laneName = lane.name;
      const count = laneCounts[laneName] || 0;
      const totalPages = Math.ceil(count / lanePageSize);

      // Get lane-specific sort from query param (client-side laneSort), else use global
      const laneSortEntry = laneSortMap?.[laneName];
      const laneSortBy = laneSortEntry?.sortBy ?? sortBy;
      const laneSortOrder = toSortOrder(laneSortEntry?.sortOrder, sortOrder);

      // Get active filters array
      const activeFilters = getActiveFilters(jobFilters);

      if (count > 0) {
        const { candidates, pageInfo } = await getCandidates(
          jobId,
          userData.organizationId,
          {
            lanes: [lane],
            page: 1,
            limit: lanePageSize,
            sortBy: laneSortBy,
            sortOrder: laneSortOrder,
            includeArchived,
            laneConfig: laneSortEntry
              ? {
                  sortBy: laneSortEntry.sortBy,
                  sortOrder: laneSortEntry.sortOrder as 1 | -1,
                }
              : undefined,
            jobFilters,
            isInterviewer,
          },
        );

        lanesData[laneName] = {
          candidates,
          count,
          hasMore: pageInfo.hasNextPage,
          page: 1,
          totalPages,
          pageInfo,
          sorting: {
            sortBy: laneSortBy,
            sortOrder: laneSortOrder,
          },
          filters: activeFilters,
        };
      } else {
        lanesData[laneName] = {
          candidates: [],
          count: 0,
          hasMore: false,
          page: 1,
          totalPages: 0,
          pageInfo: { hasNextPage: false, nextCursor: null },
          sorting: {
            sortBy: laneSortBy,
            sortOrder: laneSortOrder,
          },
          filters: activeFilters,
        };
      }
    }

    // Create lane mapping: lane name -> Lane ObjectId (for frontend to use)
    const laneMapping: Record<string, string> = {};
    effectiveLanes.forEach((lane) => {
      laneMapping[lane.name] = lane._id.toString();
    });

    // Get active filters for the job
    const jobActiveFilters = getActiveFilters(jobFilters);

    // Calculate filtered and unfiltered totals
    const filteredTotal = Object.values(laneCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const unfilteredNonArchivedTotal = Object.values(
      unfilteredLaneCounts,
    ).reduce((sum, count) => sum + count, 0);
    const archivedTotal = Object.values(archivedLaneCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalAllCandidates = unfilteredNonArchivedTotal + archivedTotal;

    return NextResponse.json({
      lanes: lanesData,
      meta: {
        jobId,
        useCustomLanes,
        availableLanes: effectiveLaneNames, // Return lane names for frontend
        laneMapping, // Map lane names to ObjectIds
        totalCandidates: totalAllCandidates, // All candidates (archived + active)
        totalCandidatesUnfiltered: unfilteredNonArchivedTotal, // Unfiltered, excluding archived
        totalCandidatesFiltered: filteredTotal, // Filtered total (with filters applied)
        filters: jobActiveFilters, // Return active filters array
        filter: jobFilters ?? {}, // Applied filter from query params (client-side)
      },
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: request.url,
      },
      'Get candidates error',
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
