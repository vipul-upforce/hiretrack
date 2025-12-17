
/**
 * Status update email queue data
 */
export interface StatusUpdateQueueData {
  organizationId: string;
  eventTitle: string;
  eventSubTitle: string;
  candidateName: string;
  status: string;
  remark?: string;
  rating?: number;
  jobName?: string;
  emailList: string[];
  actionBy?: string;
  prevStatus?: string;
  candidateDetails: string;
  candidateId: string;
  jobId?: string;
  sentBy?: string;
  sentByEmail?: string;
  sentByName?: string;
  startTime?: string;
  endTime?: string;
  hrContactInfo?: string;
}

/**
 * Email queue item structure
 */
export interface EmailQueueItem {
  data: StatusUpdateQueueData;
  timer: ReturnType<typeof setTimeout>;
  timestamp: number;
  historyIds: string[];
}

/**
 * Request body for status update email
 */
export interface StatusUpdateEmailRequest {
  jobName?: string;
  jobId?: string;
  eventTitle: string;
  candidateName: string;
  status: string;
  remark?: string;
  rating?: number;
  immediate?: boolean;
  id: string;
  prev_status?: string;
  endTime?: string;
  startTime?: string;
}

/**
 * Queue status response item
 */
export interface QueueStatusItem {
  key: string;
  candidateName: string;
  status: string;
  remark?: string;
  rating?: number;
  scheduledAt: string;
  timeRemaining: string;
  pendingHistoryRecords: number;
}

/**
 * Queue status response
 */
export interface QueueStatusResponse {
  queueSize: number;
  queue: QueueStatusItem[];
}

/**
 * Email content with subject and body
 */
export interface EmailContent {
  subject: string;
  body: string;
}

/**
 * Update email history parameters
 */
export interface UpdateHistoryParams {
  historyIds: string[];
  status: 'sent' | 'failed';
  error?: string;
  updatedContent?: EmailContent;
}
