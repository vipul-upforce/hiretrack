import { DuplicateCandidate } from '@/lib/mongodb';
import { ICandidate } from '@/lib/models/candidate';

/**
 * Calculates the number of duplicate candidates for a given candidate's email and organization.
 * @param candidate The candidate object to check for duplicates.
 * @param organizationId The ID of the organization.
 * @returns The count of unique candidate IDs sharing the same email and organization.
 */
export async function getDuplicateCountForCandidate(
  candidate: ICandidate,
  organizationId: string,
): Promise<number> {
  if (!candidate.email || !organizationId) {
    return 0;
  }
  const duplicateEntry = await DuplicateCandidate?.findOne({
    email: candidate.email.toLowerCase(),
    orgId: organizationId,
  }).lean();

  if (duplicateEntry && duplicateEntry.duplicates) {
    return duplicateEntry.duplicates.length;
  }
  return 0;
}
