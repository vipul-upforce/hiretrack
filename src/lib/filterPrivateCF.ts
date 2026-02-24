import { NextRequest } from 'next/server';
import { CustomField } from '@/Custom_Fields/Types/CustomField';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { Organization } from './mongodb';
import { ICandidate } from './models/candidate';

// Helper function to filter customFields for a single candidate
const filterCandidateCustomFields = (
  candidate: ICandidate,
  privateFieldLabels: string[],
  validFieldLabels?: string[],
): ICandidate => {
  const filteredCustomFields = Object.fromEntries(
    Object.entries(candidate.customFields || {}).filter(([key]) => {
      // Filter out private fields
      if (privateFieldLabels.includes(key)) {
        return false;
      }
      // Filter out deleted fields (fields not in metadata)
      if (validFieldLabels && !validFieldLabels.includes(key)) {
        return false;
      }
      return true;
    }),
  );
  return {
    ...candidate,
    customFields: filteredCustomFields,
  };
};

// Function to filter private customFields for multiple candidates
const getFilterPrivateCF = async (
  candidates: ICandidate[],
  req: NextRequest,
): Promise<ICandidate[] | undefined> => {
  if (!Organization) return undefined;

  const userData = await getAuthenticatedUser(req);
  if (!userData) return undefined;

  const orgData = await Organization.findById(userData.organizationId, {
    customFields: 1,
  });
  if (!orgData) return candidates;

  // Get private field labels from organization.customFields.g2xh8hoe1.fields
  const privateFieldLabels = (
    (Object.values(orgData.customFields)[1]?.fields || []) as CustomField[]
  )
    .filter((field) => field.privateInt === true)
    .map((field) => field.label);

  if (userData.role === 'interviewer') {
    const candidatesWithoutPrivateCF = await Promise.all(
      candidates.map(async (candidate) =>
        filterCandidateCustomFields(candidate, privateFieldLabels),
      ),
    );
    return candidatesWithoutPrivateCF;
  }

  // Return candidates unchanged if not interviewer
  return candidates;
};

// Function to filter private customFields for a single candidate
const getFilterPrivateCFSingle = async (
  candidate: ICandidate,
  role: string,
  organizationId: string,
): Promise<ICandidate | undefined> => {
  if (!Organization) return undefined;

  const orgData = await Organization.findById(organizationId, {
    customFields: 1,
  });
  if (!orgData || !orgData.customFields) return candidate;

  // Get all fields from organization.customFields
  // The structure is: { [formId]: { fields: CustomField[] } }
  const allFields = (Object.values(orgData.customFields)[1]?.fields ||
    []) as CustomField[];

  // Get all valid field labels (fields that exist in metadata)
  // This is used to filter out deleted fields
  const validFieldLabels = allFields.map((field) => field.label);

  // For interviewers: filter fields with privateInt === true AND deleted fields
  if (role === 'interviewer') {
    const privateIntFieldLabels = allFields
      .filter((field) => field.privateInt === true)
      .map((field) => field.label);
    return filterCandidateCustomFields(
      candidate,
      privateIntFieldLabels,
      validFieldLabels,
    );
  }

  // For candidates: filter fields with private === true AND deleted fields
  if (role === 'candidate') {
    const privateFieldLabels = allFields
      .filter((field) => field.private === true)
      .map((field) => field.label);
    return filterCandidateCustomFields(
      candidate,
      privateFieldLabels,
      validFieldLabels,
    );
  }

  // For admin/hr: only filter deleted fields (still show private fields)
  return filterCandidateCustomFields(candidate, [], validFieldLabels);
};
export { getFilterPrivateCF, getFilterPrivateCFSingle };
