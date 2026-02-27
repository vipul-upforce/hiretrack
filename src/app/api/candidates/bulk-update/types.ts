import type { ICandidate } from '@/lib/models/candidate';
import type { ICandidateHistory } from '@/lib/models/history';

export type BulkUpdateOperation =
  | 'assign'
  | 'unassign'
  | 'archive'
  | 'moveJob'
  | 'addRemark'
  | 'addFollowUp'
  | 'removeFollowUp'
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
  /** Schedule Zoom meeting */
  scheduleZoomMeet?: boolean;
  /** Zoom meeting duration in minutes */
  zoomMeetDuration?: number;
  /** Zoom meeting notes */
  zoomMeetingNotes?: string;
  /** Attachments for the Zoom meeting */
  zoomMeetingAttachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  /** Additional guest emails for Zoom */
  zoomAdditionalGuests?: string[];
  /** Optional remark when assign + add remark done together (in history note only) */
  remark?: string;
}

export interface BulkUnassignParams extends BulkUpdateBaseParams {
  /** Optional remark/feedback for unassign notification email */
  remark?: string;
}

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

export type BulkRemoveFollowUpParams = BulkUpdateBaseParams;

export interface BulkStatusUpdateParams extends BulkUpdateBaseParams {
  status: string;
  /** Optional remark when status update is done with add-remark (statusMessage in email) */
  remark?: string;
}

export type BulkUpdateParams =
  | ({ operation: 'assign' } & BulkAssignParams)
  | ({ operation: 'unassign' } & BulkUnassignParams)
  | ({ operation: 'archive' } & BulkArchiveParams)
  | ({ operation: 'moveJob' } & BulkMoveJobParams)
  | ({ operation: 'addRemark' } & BulkAddRemarkParams)
  | ({ operation: 'addFollowUp' } & BulkAddFollowUpParams)
  | ({ operation: 'removeFollowUp' } & BulkRemoveFollowUpParams)
  | ({ operation: 'statusUpdate' } & BulkStatusUpdateParams);

/** Operation params WITHOUT candidateIds (since they're shared across all operations) */
export type BulkUpdateOperationParams =
  | ({ operation: 'assign' } & Omit<BulkAssignParams, 'candidateIds'>)
  | ({ operation: 'unassign' } & Omit<BulkUnassignParams, 'candidateIds'>)
  | ({ operation: 'archive' } & Omit<BulkArchiveParams, 'candidateIds'>)
  | ({ operation: 'moveJob' } & Omit<BulkMoveJobParams, 'candidateIds'>)
  | ({ operation: 'addRemark' } & Omit<BulkAddRemarkParams, 'candidateIds'>)
  | ({ operation: 'addFollowUp' } & Omit<BulkAddFollowUpParams, 'candidateIds'>)
  | ({ operation: 'removeFollowUp' } & Omit<
      BulkRemoveFollowUpParams,
      'candidateIds'
    >)
  | ({ operation: 'statusUpdate' } & Omit<
      BulkStatusUpdateParams,
      'candidateIds'
    >);

/** Request body supporting multiple operations */
export interface BulkUpdateRequest {
  candidateIds: string[];
  operations: BulkUpdateOperationParams[];
}

/** Context passed to each bulk executor; models from connectToDatabase() */
export interface BulkUpdateContext {
  user: {
    id: string;
    name: string;
    email?: string;
    organizationId?: string;
    organizationInfo?: { name?: string };
  };
  dateTime: string;
  Candidate: import('mongoose').Model<ICandidate>;
  History: import('mongoose').Model<import('@/lib/models/history').IHistory>;
  Job: import('mongoose').Model<import('@/lib/models/job').IJob>;
  User: import('mongoose').Model<import('@/lib/models/user').IUser>;
  DuplicateCandidate:
    | import('mongoose').Model<
        import('@/lib/models/duplicateCandidates').IDuplicateCandidate
      >
    | null;
  /** Request headers for making authenticated internal API calls */
  requestHeaders?: Headers;
}

/** Meta for bulk-assign notification: interviewer gets one per candidate, admin/hr get one bulk */
export interface BulkAssignNotificationMeta {
  interviewerId: string;
  interviewerName: string;
  jobId: string;
  jobTitle: string;
  candidates: Array<{ candidateId: string; candidateName: string; jobId?: string }>;
  /** When meeting is scheduled: ISO string */
  scheduledTime?: string | null;
  /** Meeting duration in minutes */
  duration?: number;
  /** First candidate's meeting link (Google Meet or Zoom) when scheduled */
  meetingLink?: string | null;
  /** Outlook calendar add link when scheduled */
  outlookCalendarLink?: string | null;
  /** Interview type when meeting scheduled */
  interviewType?: string;
}

/** Meta for bulk-unassign notification: each previous interviewer gets one per candidate, admin/hr get one bulk */
export interface BulkUnassignNotificationMeta {
  unassignments: Array<{
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    previousInterviewerId: string;
    previousInterviewerName: string;
  }>;
  /** Feedback message for bulk-unassign email template */
  feedback?: string;
  /** Next step message for bulk-unassign email template */
  nextStep?: string;
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
  /** For assign: used to send bulk assign notifications (interviewer = separate; admin/hr = one bulk) */
  assignNotificationMeta?: BulkAssignNotificationMeta;
  /** For unassign: used to send bulk unassign notifications */
  unassignNotificationMeta?: BulkUnassignNotificationMeta;
  /** For addRemark: used to send bulk remark notifications (mentioned users = separate per candidate; admin/hr = one bulk) */
  addRemarkNotificationMeta?: {
    remarkText: string;
    roles: string[];
    validMentionUserIds?: string[];
    /** Rating (0-5) for bulk remark email template */
    rating?: number;
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      jobId: string;
      jobTitle: string;
    }>;
  };
  /** For addFollowUp: used to send bulk follow-up notifications */
  addFollowUpNotificationMeta?: {
    followupNote: string;
    followupDate?: string | null;
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      jobId: string;
      jobTitle: string;
    }>;
  };
  /** For removeFollowUp: used to send bulk follow-up removal notifications */
  removeFollowUpNotificationMeta?: {
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      jobId: string;
      jobTitle: string;
    }>;
  };
  /** For statusUpdate: used to send bulk status update notifications */
  statusUpdateNotificationMeta?: {
    newStatus: string;
    nextStep?: string;
    /** Remark text when status update + remark done together (statusMessage in email) */
    statusMessage?: string;
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      jobId: string;
      jobTitle: string;
      oldStatus: string;
    }>;
  };
}
