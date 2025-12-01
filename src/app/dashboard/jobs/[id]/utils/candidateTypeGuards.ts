/**
 * Type guards for candidate data structures
 * Used to safely check and narrow types for inconsistent API/SSE data
 */

/**
 * Job object structure (populated from database)
 */
export interface JobObject {
  _id: string;
  title: string;
  description: string;
  skills?: string[];
}

/**
 * Interviewer object structure (populated from database)
 */
export interface InterviewerObject {
  _id: string;
  name: string;
  email: string;
  duration?: string;
}

/**
 * Type guard to check if jobId is a populated object
 */
export function isPopulatedJobId(jobId: unknown): jobId is JobObject {
  return (
    typeof jobId === "object" &&
    jobId !== null &&
    "_id" in jobId &&
    "title" in jobId &&
    typeof (jobId as JobObject)._id === "string" &&
    typeof (jobId as JobObject).title === "string"
  );
}

/**
 * Type guard to check if interviewerId is a populated object
 */
export function isPopulatedInterviewer(
  interviewerId: unknown
): interviewerId is InterviewerObject {
  return (
    typeof interviewerId === "object" &&
    interviewerId !== null &&
    "_id" in interviewerId &&
    "name" in interviewerId &&
    typeof (interviewerId as InterviewerObject)._id === "string" &&
    typeof (interviewerId as InterviewerObject).name === "string"
  );
}

/**
 * Type guard to check if candidate has valid tracking data
 */
export function hasValidTracking(
  candidate: unknown
): candidate is { tracking: { createdAt: string | Date; updatedAt: string | Date } } {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "tracking" in candidate &&
    typeof (candidate as { tracking?: unknown }).tracking === "object" &&
    (candidate as { tracking?: { createdAt?: unknown; updatedAt?: unknown } }).tracking !== null &&
    "createdAt" in (candidate as { tracking: { createdAt?: unknown } }).tracking &&
    "updatedAt" in (candidate as { tracking: { updatedAt?: unknown } }).tracking
  );
}

/**
 * Type guard to check if value is a valid date string or Date object
 */
export function isValidDate(value: unknown): value is string | Date {
  if (value instanceof Date) return true;
  if (typeof value === "string") {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return false;
}

