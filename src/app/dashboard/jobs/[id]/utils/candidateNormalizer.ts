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
/**
 * Always returns a string so Client B job comparison never drops candidates
 * when decoded payload has jobId._id as object (e.g. Mongo serialization).
 */
export function normalizeJobId(
  jobId: string | JobObject | undefined | null,
): string {
  if (!jobId) {
    return '';
  }

  if (isPopulatedJobId(jobId)) {
    return String(jobId._id);
  }

  if (typeof jobId === 'string') {
    return jobId;
  }

  // SSE/JWT may send jobId as { _id: ObjectId }; still extract string for comparison
  if (typeof jobId === 'object' && jobId !== null && '_id' in jobId) {
    const id = (jobId as { _id: unknown })._id;
    return id != null ? String(id) : '';
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
 * Keys that may be updated by SSE (details, remarks, tags, assignment, etc.).
 * Used for merge so partial SSE payloads do not wipe these fields when merging.
 */
export const BASIC_DETAIL_KEYS = [
  'name',
  'email',
  'contact',
  'location',
  'status',
  'followUp',
  'remarks',
  'remarksCount',
  'tags',
  'assignment',
  'tracking',
  'scores',
  'history',
  'customFields',
  'jobDetails',
  'resume',
  'attachments',
  'experience',
  'relevantExperience',
  'skills',
  'expectedCTC',
  'currentCTC',
  'noticePeriod',
  'jobId',
  'isDeleted',
] as const;

/**
 * Merge SSE override into base candidate without wiping fields missing from override.
 * Use when applying partial SSE updates so contact, remarks, tags, assignment etc. are preserved.
 */
export function mergeCandidate(
  base: NormalizedCandidate,
  override: Record<string, unknown> | NormalizedCandidate,
): NormalizedCandidate {
  const overrideObj =
    override && typeof override === 'object'
      ? (override as Record<string, unknown>)
      : {};
  const result = { ...base } as Record<string, unknown>;

  // Some updates intentionally clear a value (e.g. "Mark as done" sets assignment=null).
  // For these keys, `null` is a meaningful value and must overwrite the base.
  const NULLABLE_OVERRIDE_KEYS = new Set([
    'assignment',
    'resume',
    'followUp',
  ]);

  for (const key of BASIC_DETAIL_KEYS) {
    const val = overrideObj[key];
    if (val === null && NULLABLE_OVERRIDE_KEYS.has(key)) {
      result[key] = null;
      continue;
    }
    if (val !== undefined && val !== null) {
      result[key] = val;
    }
  }

  return result as unknown as NormalizedCandidate;
}

/**
 * Options for normalizing candidate status when it is stored as lane ObjectId.
 * Pass laneIdToName (ObjectId -> lane name) so status resolves to the correct lane instead of defaulting to 'applied'.
 */
export interface NormalizeCandidateOptions {
  /** Map lane ObjectId string -> lane name. Used when API returns status as ObjectId to avoid wrongly placing candidates in "applied". */
  laneIdToName?: Record<string, string>;
}

/**
 * Normalize a candidate from API/SSE data
 */
export function normalizeCandidate(
  candidate: unknown,
  options?: NormalizeCandidateOptions,
): NormalizedCandidate | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const candidateObj = candidate as Record<string, unknown>;

  // Coerce _id to string so SSE/JWT-decoded payloads (ObjectId or { $oid }) never cause null
  const rawId = candidateObj._id;
  let idStr = '';
  if (rawId != null) {
    if (typeof rawId === 'string') {
      idStr = rawId;
    } else {
      const obj = rawId as { toString?: () => string; $oid?: string };
      idStr = String(obj.toString?.() ?? obj.$oid ?? rawId);
    }
  }
  if (!idStr) return null;
  // Some SSE payloads are partial; tolerate missing `name` so we can still
  // apply status deltas and lane moves based on `_id` + `status`.
  const normalizedName =
    typeof candidateObj.name === 'string' ? candidateObj.name : '';

  // Normalize jobId (always string for consistent comparison on Client B)
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

  // Normalize status to a lowercase lane name string when possible.
  // Handles:
  // - string lane name (e.g., "applied")
  // - populated lane object with { name }
  // - ObjectId string (24 hex) → resolve via laneIdToName when provided (fixes checklist/update dupes in "applied"); else "applied"
  // - missing value → "applied"
  const rawStatus = candidateObj.status as unknown;
  const OBJECT_ID_HEX_LENGTH = 24;
  const isObjectIdString = (v: string) =>
    typeof v === 'string' &&
    v.length === OBJECT_ID_HEX_LENGTH &&
    /^[0-9a-fA-F]+$/.test(v);
  const laneIdToName = options?.laneIdToName;
  let normalizedStatus = 'applied';
  if (typeof rawStatus === 'string') {
    if (isObjectIdString(rawStatus)) {
      // Some SSE payloads may serialize ObjectIds with different hex casing.
      // Make lookup case-insensitive by indexing with lowercase.
      const oid = rawStatus.toLowerCase();
      normalizedStatus = (laneIdToName?.[oid] ?? 'applied').toLowerCase();
    } else {
      normalizedStatus = rawStatus.toLowerCase();
    }
  } else if (
    rawStatus &&
    typeof rawStatus === 'object' &&
    '_id' in (rawStatus as { _id?: unknown })
  ) {
    const idValue = (rawStatus as { _id?: unknown })._id;
    if (idValue != null) {
      const rawStatusIdStr = String(idValue);
      if (isObjectIdString(rawStatusIdStr)) {
        const oid = rawStatusIdStr.toLowerCase();
        normalizedStatus = (laneIdToName?.[oid] ?? 'applied').toLowerCase();
      } else {
        const nameValue = (rawStatus as { name?: unknown }).name;
        if (nameValue) {
          const s = String(nameValue);
          normalizedStatus = isObjectIdString(s)
            ? (laneIdToName?.[s.toLowerCase()] ?? 'applied').toLowerCase()
            : s.toLowerCase();
        }
      }
    }
  } else if (
    rawStatus &&
    typeof rawStatus === 'object' &&
    'name' in (rawStatus as { name?: unknown })
  ) {
    const nameValue = (rawStatus as { name?: unknown }).name;
    if (nameValue) {
      const s = String(nameValue);
      normalizedStatus = isObjectIdString(s)
        ? (laneIdToName?.[s.toLowerCase()] ?? 'applied').toLowerCase()
        : s.toLowerCase();
    }
  }

  // Build normalized candidate
  const normalized: NormalizedCandidate = {
    _id: idStr,
    jobId: normalizedJobId,
    name: normalizedName,
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
    status: normalizedStatus as Candidate['status'],
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
