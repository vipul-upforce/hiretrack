/**
 * Safe data access helpers for candidate objects
 * Provides type-safe access to potentially inconsistent data structures
 */

import { Candidate } from '@/types/candidate';
import {
  isPopulatedJobId,
  isPopulatedInterviewer,
} from './candidateTypeGuards';

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
 * Check if candidate has Google Meet
 */
export function hasGoogleMeet(
  candidate: Candidate | null | undefined,
): boolean {
  return (
    hasAssignment(candidate) && candidate?.assignment?.googleMeet !== undefined
  );
}
