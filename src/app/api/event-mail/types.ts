import { NextRequest } from 'next/server';

export interface EventMailQueueData {
  organizationId: string;
  email: string;
  eventTitle: string;
  startTime?: string;
  endTime?: string;
  jobName?: string;
  interviewerName?: string;
  candidateName?: string;
  status?: string;
  emailList: string[];
  candidateDetailsPage: string;
  sentBy: string;
  sentByEmail: string;
  sentByName: string;
  candidateId: string;
  jobId?: string;
  dashboardLink?: string;
}

/**
 * Email queue item structure
 */
export interface EmailQueueItem {
  data: EventMailQueueData;
  timer: ReturnType<typeof setTimeout>;
  timestamp: number;
  historyIds: string[];
  senderEmail?: string;
}

// Re-export shared types for backward compatibility
export type { EmailContent, UpdateHistoryParams } from '@/lib/utils/emailTypes';

/**
 * Request body for POST endpoint (interview assignment)
 */
export interface InterviewAssignmentRequest {
  email: string;
  eventTitle: string;
  startTime?: string;
  endTime?: string;
  jobId?: string;
  jobName?: string;
  interviewerName?: string;
  candidateName?: string;
  status?: string;
  immediate?: boolean;
  id: string;
}

/**
 * Request body for PUT endpoint (step completed)
 */
export interface StepCompletedRequest {
  feedback?: {
    description?: string;
    rating?: string | number;
  };
  dateTime: string;
  status: string;
  candidateId: string;
  jobId?: string;
  name: string;
  title?: string;
}

/**
 * Queue status response item
 */
export interface QueueStatusItem {
  key: string;
  candidateName: string;
  jobName?: string;
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
 * Email sending result
 */
export interface EmailSendResult {
  status: number;
  message: string;
}

/**
 * Schedule email result
 */
export interface ScheduleEmailResult {
  success: boolean;
  message: string;
}

// Re-export shared type for backward compatibility
export type { ResolveSentByParams } from '@/lib/utils/userResolution';

/**
 * Create pending history parameters
 */
export interface CreatePendingHistoryParams {
  data: EventMailQueueData;
  organizationId: string;
}

/**
 * Send queued email parameters
 */
export interface SendQueuedEmailParams {
  data: EventMailQueueData;
  req: NextRequest;
  historyIds?: string[];
}
