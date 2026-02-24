
import { Organization } from '@/lib/models/user';

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
 * Get next step from organization default lanes
 */
export function getNextStep(
  organization:
    | {
        organizationId?: Organization | string | unknown;
      }
    | null
    | undefined,
  currentStatus: string,
): string {
  if (!organization?.organizationId) {
    return 'N/A';
  }

  const orgId = organization.organizationId;
  if (
    typeof orgId === 'object' &&
    orgId !== null &&
    isOrganization(orgId)
  ) {
    const { defaultLanes } = orgId;
    if (defaultLanes) {
      const currentIndex = defaultLanes.indexOf(currentStatus);
      if (currentIndex >= 0 && currentIndex < defaultLanes.length - 1) {
        return defaultLanes[currentIndex + 1] || 'N/A';
      }
    }
  }
  return 'N/A';
}
