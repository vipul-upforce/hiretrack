/**
 * Candidate data normalization utilities
 * Normalizes inconsistent API/SSE data into consistent shapes
 */

import { Candidate } from '@/types/candidate';
import { FileAttachment } from '@/lib/fileUtils';
import {
  isPopulatedJobId,
  isPopulatedInterviewer,
  isValidDate,
  JobObject,
  InterviewerObject,
} from './candidateTypeGuards';

/**
 * Normalized job ID (always a string)
 */
export type NormalizedJobId = string;

/**
 * Normalized interviewer information
 */
export interface NormalizedInterviewer {
  _id: string;
  name: string;
  email: string;
  duration?: string;
}

/**
 * Normalized assignment structure
 */
export interface NormalizedAssignment {
  interviewerId: NormalizedInterviewer | string;
  time: string | Date;
  duration?: string;
  assignedAt: string | Date;
  googleMeet?: {
    eventId: string;
    meetingLink: string;
    htmlLink: string;
    summary: string;
    description: string;
    meetingAttachments?: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
    meetingNotes?: string;
    attendeeResponses?: Array<{
      email: string;
      name?: string;
      responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative';
      comment?: string;
      lastUpdated: Date | string;
      notificationSent?: boolean;
    }>;
    lastSyncedAt?: Date | string;
  };
  zoomMeet?: {
    meetingId: string;
    meetingLink: string;
    startUrl?: string;
    eventId?: string;
    htmlLink?: string;
    summary?: string;
    description?: string;
    meetingAttachments?: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
    meetingNotes?: string;
    lastSyncedAt?: Date | string;
  };
  microsoftTeams?: {
    meetingId: string;
    meetingLink: string;
    eventId?: string;
    htmlLink?: string;
    summary?: string;
    description?: string;
    meetingAttachments?: Array<{
      id: string;
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
    meetingNotes?: string;
    lastSyncedAt?: Date | string;
  };
}

/**
 * Normalized tracking data
 */
export interface NormalizedTracking {
  createdAt: string;
  updatedAt: string;
  assignedToJobDate?: string;
}

/**
 * Normalized candidate (after normalization)
 */
export interface NormalizedCandidate extends Omit<
  Candidate,
  'jobId' | 'assignment' | 'tracking'
> {
  jobId: JobObject | string;
  assignment: NormalizedAssignment | null;
  tracking: NormalizedTracking;
  remarksCount?: number;
}

/**
 * Normalize jobId to always return string ID
 */
export function normalizeJobId(
  jobId: string | JobObject | undefined | null,
): string {
  if (!jobId) {
    return '';
  }

  if (isPopulatedJobId(jobId)) {
    return jobId._id;
  }

  if (typeof jobId === 'string') {
    return jobId;
  }

  return '';
}

/**
 * Normalize interviewerId to consistent shape
 * Returns object if populated, string ID otherwise
 */
export function normalizeInterviewerId(
  interviewerId: string | InterviewerObject | undefined | null,
): NormalizedInterviewer | string {
  if (!interviewerId) {
    return '';
  }

  if (isPopulatedInterviewer(interviewerId)) {
    return {
      _id: interviewerId._id,
      name: interviewerId.name,
      email: interviewerId.email,
      duration: interviewerId.duration,
    };
  }

  if (typeof interviewerId === 'string') {
    return interviewerId;
  }

  return '';
}

/**
 * Normalize assignment data
 */
export function normalizeAssignment(
  assignment: unknown,
): NormalizedAssignment | null {
  if (!assignment || typeof assignment !== 'object') {
    return null;
  }

  const assignmentObj = assignment as Record<string, unknown>;

  const interviewerId = normalizeInterviewerId(
    assignmentObj.interviewerId as string | InterviewerObject | undefined,
  );

  // Normalize time - ensure it's a valid date string or Date
  let time: string | Date = '';
  if (assignmentObj.time) {
    if (isValidDate(assignmentObj.time)) {
      time = assignmentObj.time;
    } else if (typeof assignmentObj.time === 'string') {
      time = assignmentObj.time;
    }
  }

  // Normalize assignedAt
  let assignedAt: string | Date = new Date().toISOString();
  if (assignmentObj.assignedAt) {
    if (isValidDate(assignmentObj.assignedAt)) {
      assignedAt = assignmentObj.assignedAt;
    } else if (typeof assignmentObj.assignedAt === 'string') {
      assignedAt = assignmentObj.assignedAt;
    }
  }

  return {
    interviewerId,
    time,
    duration:
      typeof assignmentObj.duration === 'string'
        ? assignmentObj.duration
        : undefined,
    assignedAt,
    googleMeet: assignmentObj.googleMeet as NormalizedAssignment['googleMeet'],
    zoomMeet: assignmentObj.zoomMeet as NormalizedAssignment['zoomMeet'],
    microsoftTeams:
      assignmentObj.microsoftTeams as NormalizedAssignment['microsoftTeams'],
  };
}

/**
 * Normalize tracking data
 */
export function normalizeTracking(
  tracking: unknown,
  fallbackCreatedAt?: string | Date,
  fallbackUpdatedAt?: string | Date,
): NormalizedTracking {
  const now = new Date().toISOString();

  if (!tracking || typeof tracking !== 'object') {
    return {
      createdAt:
        fallbackCreatedAt instanceof Date
          ? fallbackCreatedAt.toISOString()
          : fallbackCreatedAt || now,
      updatedAt:
        fallbackUpdatedAt instanceof Date
          ? fallbackUpdatedAt.toISOString()
          : fallbackUpdatedAt || now,
    };
  }

  const trackingObj = tracking as Record<string, unknown>;

  const normalizeDate = (
    value: unknown,
    fallback: string | Date | undefined,
  ): string => {
    if (isValidDate(value)) {
      return value instanceof Date ? value.toISOString() : value;
    }
    if (fallback) {
      return fallback instanceof Date ? fallback.toISOString() : fallback;
    }
    return now;
  };

  return {
    createdAt: normalizeDate(trackingObj.createdAt, fallbackCreatedAt),
    updatedAt: normalizeDate(trackingObj.updatedAt, fallbackUpdatedAt),
    assignedToJobDate: (() => {
      if (
        trackingObj.assignedToJobDate &&
        isValidDate(trackingObj.assignedToJobDate)
      ) {
        if (trackingObj.assignedToJobDate instanceof Date) {
          return trackingObj.assignedToJobDate.toISOString();
        }
        return trackingObj.assignedToJobDate;
      }
      return undefined;
    })(),
  };
}

/**
 * Normalize a candidate from API/SSE data
 */
export function normalizeCandidate(
  candidate: unknown,
): NormalizedCandidate | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const candidateObj = candidate as Record<string, unknown>;

  // Validate required fields
  if (
    !candidateObj._id ||
    typeof candidateObj._id !== 'string' ||
    !candidateObj.name ||
    typeof candidateObj.name !== 'string'
  ) {
    return null;
  }

  // Normalize jobId
  const jobId = candidateObj.jobId as string | JobObject | undefined;
  const normalizedJobId = isPopulatedJobId(jobId)
    ? jobId
    : normalizeJobId(jobId);

  // Normalize assignment
  const assignment = normalizeAssignment(candidateObj.assignment);

  // Normalize tracking
  const tracking = normalizeTracking(
    candidateObj.tracking,
    candidateObj.createdAt as string | Date | undefined,
    candidateObj.updatedAt as string | Date | undefined,
  );

  // Build normalized candidate
  const normalized: NormalizedCandidate = {
    _id: candidateObj._id as string,
    jobId: normalizedJobId,
    name: candidateObj.name as string,
    email: (candidateObj.email as string) || '',
    contact: (candidateObj.contact as string) || '',
    location: (candidateObj.location as string) || '',
    experience:
      typeof candidateObj.experience === 'number' ? candidateObj.experience : 0,
    relevantExperience:
      typeof candidateObj.relevantExperience === 'number'
        ? candidateObj.relevantExperience
        : 0,
    skills: Array.isArray(candidateObj.skills)
      ? (candidateObj.skills as string[])
      : [],
    expectedCTC:
      typeof candidateObj.expectedCTC === 'number'
        ? candidateObj.expectedCTC
        : undefined,
    currentCTC:
      typeof candidateObj.currentCTC === 'number'
        ? candidateObj.currentCTC
        : undefined,
    noticePeriod:
      typeof candidateObj.noticePeriod === 'number'
        ? candidateObj.noticePeriod
        : 0,
    tags: Array.isArray(candidateObj.tags) ? candidateObj.tags : undefined,
    resume: (candidateObj.resume as FileAttachment) || null,
    remarks: Array.isArray(candidateObj.remarks)
      ? candidateObj.remarks
      : undefined,
    remarksCount:
      typeof candidateObj.remarksCount === 'number'
        ? candidateObj.remarksCount
        : undefined,
    attachments: Array.isArray(candidateObj.attachments)
      ? candidateObj.attachments
      : [],
    status: (candidateObj.status as Candidate['status']) || 'applied',
    tracking,
    assignment,
    customFields: candidateObj.customFields as Candidate['customFields'],
    jobDetails: candidateObj.jobDetails as Candidate['jobDetails'],
    history: Array.isArray(candidateObj.history)
      ? candidateObj.history
      : undefined,
    isDeleted: candidateObj.isDeleted === true,
    scores: candidateObj.scores as Candidate['scores'],
    followUp: candidateObj.followUp as Candidate['followUp'],
    duplicateCount:
      typeof candidateObj.duplicateCount === 'number'
        ? candidateObj.duplicateCount
        : 0,
  };

  return normalized;
}
