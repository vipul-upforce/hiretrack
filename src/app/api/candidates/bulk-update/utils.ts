/**
 * Normalize jobId from candidate document (populated or raw).
 */
export function getJobIdString(candidate: { jobId?: unknown }): string | null {
  if (!candidate.jobId) return null;
  if (typeof candidate.jobId === 'string') return candidate.jobId;
  const obj = candidate.jobId as { _id?: unknown };
  if (obj?._id != null) {
    return typeof obj._id === 'string' ? obj._id : String(obj._id);
  }
  return null;
}
