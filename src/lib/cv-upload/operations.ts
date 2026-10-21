import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { ICandidateHistory, IinfoUpdateLog } from '@/lib/models/history';
import type { AuthenticatedUser } from '@/app/actions/auth';
import { getLaneIdByName } from '@/lib/services/laneService';

export type CvBatchOperations = {
  processingMode?: 'immediate' | 'deferred';
  assignJob?: boolean;
  jobId?: string;
  updateStatus?: boolean;
  status?: string;
  addRemark?: boolean;
  remark?: string;
  isRemarkPrivate?: boolean;
  remarkRating?: number | null;
};

export type ParsedCvBatchOperations = {
  operations: CvBatchOperations;
  selectedFileIds: string[];
};

type LaneSource = {
  lanes?: string[] | null;
  useCustomLanes?: boolean;
};

type OrgLaneSource = {
  defaultLanes?: string[] | null;
};

export function parseCvBatchOperations(
  formData: FormData,
): ParsedCvBatchOperations {
  const rawOperations = formData.get('operations');
  const rawSelected = formData.get('selectedFileIds');

  let operations: CvBatchOperations = {};
  if (typeof rawOperations === 'string' && rawOperations.trim().length > 0) {
    try {
      operations = JSON.parse(rawOperations) as CvBatchOperations;
    } catch {
      operations = {};
    }
  }

  let selectedFileIds: string[] = [];
  if (typeof rawSelected === 'string' && rawSelected.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawSelected);
      if (Array.isArray(parsed)) {
        selectedFileIds = parsed.filter(
          (id) => typeof id === 'string' && id.trim().length > 0,
        );
      }
    } catch {
      selectedFileIds = [];
    }
  }

  return { operations, selectedFileIds };
}

export function normalizeCvBatchOperations(
  operations: CvBatchOperations,
): CvBatchOperations {
  const assignJob = operations.assignJob === true;
  const processingMode =
    operations.processingMode === 'deferred' ? 'deferred' : 'immediate';
  const jobId =
    assignJob && typeof operations.jobId === 'string'
      ? operations.jobId.trim()
      : '';

  const updateStatus =
    assignJob && operations.updateStatus === true && jobId.length > 0;
  const status =
    updateStatus && typeof operations.status === 'string'
      ? operations.status.trim()
      : '';

  const addRemark = operations.addRemark === true;
  const remark =
    addRemark && typeof operations.remark === 'string'
      ? operations.remark.trim()
      : '';
  const isRemarkPrivate =
    typeof operations.isRemarkPrivate === 'boolean'
      ? operations.isRemarkPrivate
      : true;
  const remarkRating =
    typeof operations.remarkRating === 'number' ? operations.remarkRating : null;

  return {
    processingMode,
    assignJob: assignJob && jobId.length > 0,
    jobId,
    updateStatus: updateStatus && status.length > 0,
    status,
    addRemark: addRemark && remark.length > 0,
    remark,
    isRemarkPrivate,
    remarkRating,
  };
}

export function hasActiveCvBatchOperations(
  operations: CvBatchOperations,
): boolean {
  return Boolean(operations.assignJob || operations.addRemark);
}

export function getEffectiveSelectedIds(
  operations: CvBatchOperations,
  selectedFileIds: string[],
): Set<string> {
  if (!hasActiveCvBatchOperations(operations)) {
    return new Set();
  }
  return new Set(
    selectedFileIds.filter((id) => typeof id === 'string' && id.length > 0),
  );
}

export function resolveCandidateStatus({
  job,
  organization,
  requestedStatus,
}: {
  job: LaneSource | null;
  organization: OrgLaneSource | null;
  requestedStatus?: string;
}): string {
  const jobLanes =
    job?.useCustomLanes && job.lanes && job.lanes.length > 0
      ? job.lanes
      : null;
  const orgLanes =
    organization?.defaultLanes && organization.defaultLanes.length > 0
      ? organization.defaultLanes
      : [
          'applied',
          'accepted',
          'rejected',
        ];

  const lanes = jobLanes ?? orgLanes;

  if (requestedStatus && lanes.includes(requestedStatus)) {
    return requestedStatus;
  }

  if (lanes.includes('applied')) {
    return 'applied';
  }

  return lanes[0] ?? 'applied';
}

/**
 * Resolves a lane name to its Lane ObjectId for candidate persistence.
 * Job-specific lanes are preferred when jobId is provided.
 */
export async function resolveCandidateStatusObjectId(
  organizationId: string,
  laneName: string,
  jobId?: string | null,
): Promise<Types.ObjectId> {
  const laneId = await getLaneIdByName(organizationId, jobId ?? null, laneName);
  if (!laneId) {
    throw new Error(
      `Lane "${laneName}" not found. Please ensure default lanes are set up for this organization.`,
    );
  }
  return laneId;
}

/** Lane name for display/history from populated status, raw ObjectId, or legacy string. */
export function resolveStoredCandidateStatusName(status: unknown): string {
  if (status == null) {
    return 'applied';
  }
  if (typeof status === 'string') {
    const trimmed = status.trim();
    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      return 'applied';
    }
    return trimmed.toLowerCase();
  }
  if (typeof status === 'object' && status !== null && 'name' in status) {
    const name = (status as { name?: string }).name;
    return name ? name.toLowerCase() : 'applied';
  }
  return 'applied';
}

export function buildStatusHistoryEntry(
  user: AuthenticatedUser,
  dateTime: string,
  previousStatus: string,
  nextStatus: string,
): ICandidateHistory {
  const statusUpdateLog: IinfoUpdateLog = {
    title: 'Updated Status',
    previousValue: previousStatus,
    currentValue: nextStatus,
  };

  return {
    dateTime,
    title: 'Updated Status',
    previousInterviewer: null,
    currentInterviewer: null,
    assignmentBy: user.id ?? null,
    note: {
      description: [statusUpdateLog],
      date: dateTime,
      rating: 0,
      userId: user.id ?? null,
    },
    attachments: [],
  };
}

export function buildRemarkHistoryEntry(
  user: AuthenticatedUser,
  dateTime: string,
  remark: string,
  isRemarkPrivate: boolean,
  remarkRating: number | null,
): ICandidateHistory {
  return {
    dateTime,
    title: 'Remark Added',
    previousInterviewer: null,
    currentInterviewer: null,
    assignmentBy: user.id ?? null,
    remark: {
      id: uuidv4(),
      isPrivate: isRemarkPrivate,
      description: remark,
      date: dateTime,
      rating: typeof remarkRating === 'number' ? remarkRating : undefined,
      userId: {
        _id: user.id ?? '',
        name: user.name ?? 'User',
        email: user.email ?? '',
      },
    },
    note: {
      description: '',
      date: '',
      rating: 0,
      userId: null,
    },
    attachments: [],
  };
}
