import mongoose from 'mongoose';
import { PopulatedJob, JobDataForEvaluation } from '../types';

/**
 * Type guard to check if jobId is populated object
 */
export function isPopulatedJob(
  jobId: mongoose.Types.ObjectId | PopulatedJob | undefined,
): jobId is PopulatedJob {
  return typeof jobId === 'object' && jobId !== null && 'description' in jobId;
}

/**
 * Extract job data from candidate for evaluation
 */
export function extractJobDataForEvaluation(
  candidateJobId: mongoose.Types.ObjectId | PopulatedJob | undefined,
): JobDataForEvaluation {
  const jobDescription = isPopulatedJob(candidateJobId)
    ? String(candidateJobId.description)
    : '';

  return {
    description: jobDescription,
    salary:
      isPopulatedJob(candidateJobId) && candidateJobId.salary?.inText
        ? candidateJobId.salary.inText
        : undefined,
    title: isPopulatedJob(candidateJobId) ? String(candidateJobId.title) : '',
    skills:
      isPopulatedJob(candidateJobId) && candidateJobId.skills
        ? candidateJobId.skills
        : [],
    experience:
      isPopulatedJob(candidateJobId) && candidateJobId.experience
        ? candidateJobId.experience
        : undefined,
    customFields:
      isPopulatedJob(candidateJobId) && candidateJobId.customFields
        ? candidateJobId.customFields
        : undefined,
  };
}

/**
 * Extract organization ID from candidate job
 */
export function extractOrganizationId(
  candidateJobId: mongoose.Types.ObjectId | PopulatedJob | undefined,
): string {
  return isPopulatedJob(candidateJobId)
    ? String(candidateJobId.organizationId)
    : '';
}

/**
 * Extract job ID for history queries
 * Handles both ICandidate jobId format and populated job format
 */
export function extractJobIdForHistory(
  candidateJobId:
    | mongoose.Types.ObjectId
    | mongoose.Schema.Types.ObjectId
    | PopulatedJob
    | string
    | { _id: string; title: string; description: string }
    | undefined,
): mongoose.Types.ObjectId | string | undefined {
  if (!candidateJobId) return undefined;

  if (
    candidateJobId &&
    typeof candidateJobId === 'object' &&
    '_id' in candidateJobId
  ) {
    const jobIdValue = candidateJobId._id;
    return typeof jobIdValue === 'string' ? jobIdValue : String(jobIdValue);
  }

  return typeof candidateJobId === 'string'
    ? candidateJobId
    : String(candidateJobId);
}
