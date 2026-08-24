import { Organization } from '@/lib/models/user';

const DEFAULT_LANES = [
  'applied',
  'screening',
  'shortlisted',
  'processing',
  'accepted',
  'rejected',
];

/**
 * Type guard to check if object is Organization type
 */
export function isOrganization(obj: unknown): obj is Organization {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'defaultLanes' in obj &&
    Array.isArray((obj as Organization).defaultLanes)
  );
}

/**
 * Resolves lanes for a job: uses job.lanes when useCustomLanes is true,
 * otherwise falls back to organization default lanes.
 */
export async function getLanesForJob(
  jobId: string,
  organizationId: string,
): Promise<string[]> {
  const mongodb = await import('@/lib/mongodb');
  await mongodb.default();

  const job = await mongodb.Job?.findOne({
    _id: jobId,
    organizationId,
  })
    .select('lanes useCustomLanes')
    .lean();

  const useCustomLanes = Boolean(job?.useCustomLanes && job?.lanes?.length);

  if (useCustomLanes && job?.lanes) {
    return job.lanes;
  }

  const org = await mongodb.Organization?.findById(organizationId)
    .select('lanes defaultLanes')
    .lean();

  return (
    (org?.lanes as string[] | undefined) || org?.defaultLanes || DEFAULT_LANES
  );
}

/**
 * Fallback when no jobId: fetches organization default lanes only.
 */
async function getLanesForJobFallback(
  organizationId: string,
): Promise<string[]> {
  const mongodb = await import('@/lib/mongodb');
  await mongodb.default();

  const org = await mongodb.Organization?.findById(organizationId)
    .select('lanes defaultLanes')
    .lean();

  return (
    (org?.lanes as string[] | undefined) || org?.defaultLanes || DEFAULT_LANES
  );
}

/**
 * Get organization name from user document
 */
export async function getOrganizationName(
  organizationId: string,
): Promise<string> {
  const { User } = await import('@/lib/mongodb');

  const organization = await User?.findOne({
    organizationId,
  })
    .select('organizationId')
    .populate({
      path: 'organizationId',
      select: 'name',
    })
    .lean();

  return typeof organization?.organizationId === 'object' &&
    organization.organizationId
    ? (organization.organizationId.name as string)
    : '';
}

/**
 * Get next step from lanes array (pure function).
 */
export function getNextStepFromLanes(
  lanes: string[],
  currentStatus: string,
): string {
  if (!lanes?.length) return 'N/A';
  const currentIndex = lanes.indexOf(currentStatus);
  if (currentIndex >= 0 && currentIndex < lanes.length - 1) {
    return lanes[currentIndex + 1] ?? 'N/A';
  }
  return 'N/A';
}

/**
 * Get next step from job lanes. Uses job.lanes when job has useCustomLanes,
 * otherwise falls back to organization default lanes.
 */
export async function getNextStep(
  jobId: string | null | undefined,
  currentStatus: string,
  organizationId: string,
): Promise<string> {
  if (!organizationId) return 'N/A';

  const lanes = jobId
    ? await getLanesForJob(jobId, organizationId)
    : await getLanesForJobFallback(organizationId);

  return getNextStepFromLanes(lanes, currentStatus);
}
