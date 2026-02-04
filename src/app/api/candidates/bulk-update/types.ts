import type { ICandidate } from '@/lib/models/candidate';
import type { ICandidateHistory } from '@/lib/models/history';

export type BulkUpdateOperation =
  | 'assign'
  | 'unassign'
  | 'archive'
  | 'moveJob'
  | 'addRemark'
  | 'addFollowUp'
  | 'statusUpdate';

/** Base: candidateIds required for all operations */
export interface BulkUpdateBaseParams {
  candidateIds: string[];
}

export interface BulkAssignParams extends BulkUpdateBaseParams {
  interviewerId: string;
  time?: string | null;
  /** Attachments to add to candidate */
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  /** Schedule Google Calendar meeting */
  scheduleGoogleMeet?: boolean;
  /** Meeting duration in minutes */
  meetDuration?: number;
  /** Meeting notes */
  meetingNotes?: string;
  /** Attachments for the meeting */
  meetingAttachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  /** Additional guest emails */
  additionalGuests?: string[];
}

export interface BulkUnassignParams extends BulkUpdateBaseParams {}

export interface BulkArchiveParams extends BulkUpdateBaseParams {
  action: 'archive' | 'unarchive';
}

export interface BulkMoveJobParams extends BulkUpdateBaseParams {
  jobId: string;
}

export interface BulkAddRemarkParams extends BulkUpdateBaseParams {
  /** Remark text to add to all candidates */
  description: string;
  isPrivate?: boolean;
  rating?: number;
  selectedMentionUserIds?: string[];
}

export interface BulkAddFollowUpParams extends BulkUpdateBaseParams {
  note: string;
  date?: string | null;
}

export interface BulkStatusUpdateParams extends BulkUpdateBaseParams {
  status: string;
}

export type BulkUpdateParams =
  | ({ operation: 'assign' } & BulkAssignParams)
  | ({ operation: 'unassign' } & BulkUnassignParams)
  | ({ operation: 'archive' } & BulkArchiveParams)
  | ({ operation: 'moveJob' } & BulkMoveJobParams)
  | ({ operation: 'addRemark' } & BulkAddRemarkParams)
  | ({ operation: 'addFollowUp' } & BulkAddFollowUpParams)
  | ({ operation: 'statusUpdate' } & BulkStatusUpdateParams);

/** Operation params WITHOUT candidateIds (since they're shared across all operations) */
export type BulkUpdateOperationParams =
  | ({ operation: 'assign' } & Omit<BulkAssignParams, 'candidateIds'>)
  | ({ operation: 'unassign' } & Omit<BulkUnassignParams, 'candidateIds'>)
  | ({ operation: 'archive' } & Omit<BulkArchiveParams, 'candidateIds'>)
  | ({ operation: 'moveJob' } & Omit<BulkMoveJobParams, 'candidateIds'>)
  | ({ operation: 'addRemark' } & Omit<BulkAddRemarkParams, 'candidateIds'>)
  | ({ operation: 'addFollowUp' } & Omit<BulkAddFollowUpParams, 'candidateIds'>)
  | ({ operation: 'statusUpdate' } & Omit<BulkStatusUpdateParams, 'candidateIds'>);

/** Request body supporting multiple operations */
export interface BulkUpdateRequest {
  candidateIds: string[];
  operations: BulkUpdateOperationParams[];
}

/** Context passed to each bulk executor; models from connectToDatabase() */
export interface BulkUpdateContext {
  user: { id: string; name: string; email?: string; organizationId?: string; organizationInfo?: { name?: string } };
  dateTime: string;
  Candidate: import('mongoose').Model<ICandidate>;
  History: import('mongoose').Model<import('@/lib/models/history').IHistory>;
  Job: import('mongoose').Model<import('@/lib/models/job').IJob>;
  User: import('mongoose').Model<import('@/lib/models/user').IUser>;
  DuplicateCandidate: import('mongoose').Model<import('@/lib/models/duplicateCandidates').IDuplicateCandidate> | null;
  /** Request headers for making authenticated internal API calls */
  requestHeaders?: Headers;
}

export interface BulkUpdateResult {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  skippedCount?: number;
  /** Populated candidates for SSE broadcast; single batch at end */
  candidatesToBroadcast: (ICandidate & { history?: ICandidateHistory[] })[];
  /** Optional message for toast */
  message: string;
  /** For moveJob: target job title for notifications */
  meta?: { jobTitle?: string; toJobId?: string };
}
