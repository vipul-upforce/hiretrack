/**
 * Safe data access helpers for candidate objects
 * Provides type-safe access to potentially inconsistent data structures
 */

import { Candidate } from '@/types/candidate';
import {
  isPopulatedJobId,
  isPopulatedInterviewer,
} from './candidateTypeGuards';

const OBJECT_ID_HEX_LENGTH = 24;

function isLaneObjectIdString(value: string): boolean {
  return (
    value.length === OBJECT_ID_HEX_LENGTH && /^[0-9a-fA-F]+$/.test(value)
  );
}

/**
 * Resolve candidate status to a displayable lane name string.
 * Handles legacy string statuses, populated lane objects, and ObjectId strings.
 */
export function getCandidateStatusLabel(
  candidate: Candidate | null | undefined,
): string {
  const status = candidate?.status;
  if (!status) return 'unknown';
  if (typeof status === 'string') return status;
  if (typeof status === 'object' && status !== null && 'name' in status) {
    const name = (status as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name;
  }
  return String(status);
}

/**
 * Resolve candidate status to a lowercase lane key for kanban column matching.
 * Pass laneIdToName (lane ObjectId -> lane name) when SSE/API may send status as ObjectId.
 * Returns null when status is an unresolved ObjectId so callers can avoid false move-out.
 */
export function getCandidateLaneKey(
  candidate: Candidate | null | undefined,
  laneIdToName?: Record<string, string>,
): string | null {
  if (!candidate) return null;

  const status = candidate.status;
  if (!status) return 'applied';

  if (typeof status === 'string') {
    const trimmed = status.trim();
    if (!trimmed) return 'applied';
    if (isLaneObjectIdString(trimmed)) {
      const oid = trimmed.toLowerCase();
      const resolved = laneIdToName?.[oid];
      if (!resolved) return null;
      return resolved.toLowerCase();
    }
    return trimmed.toLowerCase();
  }

  if (typeof status === 'object' && status !== null && 'name' in status) {
    const name = (status as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) {
      return name.toLowerCase();
    }
    const id = (status as { _id?: unknown })._id;
    if (id != null) {
      const idStr = String(id);
      if (isLaneObjectIdString(idStr)) {
        const resolved = laneIdToName?.[idStr.toLowerCase()];
        if (!resolved) return null;
        return resolved.toLowerCase();
      }
    }
  }

  const fallback = String(status);
  if (isLaneObjectIdString(fallback)) {
    const resolved = laneIdToName?.[fallback.toLowerCase()];
    if (!resolved) return null;
    return resolved.toLowerCase();
  }
  return fallback.toLowerCase();
}

/**
 * Get job ID from candidate (handles both string and object)
 */
export function getJobId(
  candidate: Candidate | null | undefined,
): string | null {
  if (!candidate?.jobId) {
    return null;
  }

  if (isPopulatedJobId(candidate.jobId)) {
    return candidate.jobId._id;
  }

  if (typeof candidate.jobId === 'string') {
    return candidate.jobId;
  }

  // SSE/JWT can send jobId as a partially populated object (e.g. { _id, title } or { _id }).
  if (typeof candidate.jobId === 'object' && candidate.jobId !== null) {
    const id = (candidate.jobId as { _id?: unknown })._id;
    if (typeof id === 'string') return id;
    if (id != null) return String(id);
  }

  return null;
}

/**
 * Get job title from candidate
 */
export function getJobTitle(
  candidate: Candidate | null | undefined,
): string | null {
  if (!candidate?.jobId) {
    return null;
  }

  if (isPopulatedJobId(candidate.jobId)) {
    return candidate.jobId.title;
  }

  // Check jobDetails as fallback
  if (candidate.jobDetails?.title) {
    return candidate.jobDetails.title;
  }

  return null;
}

/**
 * Get interviewer name from candidate
 */
export function getInterviewerName(
  candidate: Candidate | null | undefined,
): string | undefined {
  if (!candidate?.assignment?.interviewerId) {
    return undefined;
  }

  if (isPopulatedInterviewer(candidate.assignment.interviewerId)) {
    return candidate.assignment.interviewerId.name;
  }

  return undefined;
}

/**
 * Get interviewer ID from candidate
 */
export function getInterviewerId(
  candidate: Candidate | null | undefined,
): string | undefined {
  if (!candidate?.assignment?.interviewerId) {
    return undefined;
  }

  if (isPopulatedInterviewer(candidate.assignment.interviewerId)) {
    return candidate.assignment.interviewerId._id;
  }

  if (typeof candidate.assignment.interviewerId === 'string') {
    return candidate.assignment.interviewerId;
  }

  return undefined;
}

/**
 * Get tracking date (createdAt or updatedAt)
 */
function isDateObject(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function getTrackingDate(
  candidate: Candidate | null | undefined,
  field: 'createdAt' | 'updatedAt',
): Date | null {
  if (!candidate?.tracking) return null;

  const value = candidate.tracking[field];
  if (!value) return null;

  if (isDateObject(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Check if candidate has a valid assignment
 */
export function hasAssignment(
  candidate: Candidate | null | undefined,
): boolean {
  return candidate?.assignment !== null && candidate?.assignment !== undefined;
}

/**
 * Check if candidate is assigned to an interviewer
 * A candidate is considered assigned only if they have an assignment with a valid interviewerId
 */
export function isAssigned(
  candidate: Candidate | null | undefined,
): boolean {
  if (!candidate?.assignment?.interviewerId) {
    return false;
  }

  const { interviewerId } = candidate.assignment;

  if (typeof interviewerId === 'string') {
    return interviewerId.trim() !== '';
  }

  // If it's an object, check if _id exists
  return interviewerId._id != null && interviewerId._id !== '';
}

/**
 * Check if candidate has Google Meet
 */
export function hasGoogleMeet(
  candidate: Candidate | null | undefined,
): boolean {
  return (
    hasAssignment(candidate) && candidate?.assignment?.googleMeet !== undefined
  );
}

/**
 * Check if candidate has Zoom meeting
 */
export function hasZoomMeet(
  candidate: Candidate | null | undefined,
): boolean {
  return (
    hasAssignment(candidate) && candidate?.assignment?.zoomMeet !== undefined
  );
}
