import { NextRequest } from "next/server";
import { Organization } from "./mongodb";
import { CustomField } from "@/Custom_Fields/Types/CustomField";
import { ICandidate } from "./models/candidate";
import { getAuthenticatedUser } from "@/app/actions/auth";

// Helper function to filter customFields for a single candidate
const filterCandidateCustomFields = (
  candidate: ICandidate,
  privateFieldLabels: string[]
): ICandidate => {
  const filteredCustomFields = Object.fromEntries(
    Object.entries(candidate.customFields || {}).filter(
      ([key]) => !privateFieldLabels.includes(key)
    )
  );
  return {
    ...candidate,
    customFields: filteredCustomFields,
  };
};

// Function to filter private customFields for multiple candidates
const getFilterPrivateCF = async (candidates: ICandidate[], req: NextRequest): Promise<ICandidate[] | undefined> => {
  if (!Organization) return undefined;

  const userData = await getAuthenticatedUser(req);
  if (!userData) return undefined;

  const orgData = await Organization.findById(userData.organizationId, { customFields: 1 });
  if (!orgData) return candidates;

  // Get private field labels from organization.customFields.g2xh8hoe1.fields
  const privateFieldLabels = ((Object.values(orgData.customFields)[1]?.fields || []) as CustomField[])
    .filter((field) => field.privateInt === true)
    .map((field) => field.label);

  if (userData.role === "interviewer") {
    const candidatesWithoutPrivateCF = await Promise.all(
      candidates.map(async (candidate) =>
        filterCandidateCustomFields(candidate, privateFieldLabels)
      )
    );
    return candidatesWithoutPrivateCF;
  }

  // Return candidates unchanged if not interviewer
  return candidates;
};

// Function to filter private customFields for a single candidate
const getFilterPrivateCFSingle = async (candidate: ICandidate, role: string, organizationId:string): Promise<any> => {
    console.log("🦊🦊🦊🦊🦊🦊 candidte-role-orgId: ", candidate, role, organizationId)
  if (!Organization) return undefined;

//   const user = await auth(req);
//   const userData = user?.user;
//   if (!userData) return undefined;

  const orgData = await Organization.findById(organizationId);
  if (!orgData) return candidate;

  // Get private field labels from organization.customFields.g2xh8hoe1.fields
  const privateFieldLabels = ((Object.values(orgData.customFields)[1]?.fields || []) as CustomField[])
    .filter((field) => field.privateInt === true)
    .map((field) => field.label);

  if (role === "interviewer") {
    return filterCandidateCustomFields(candidate, privateFieldLabels);
  }

  // Return candidate unchanged if not interviewer
  return candidate;
};


export { getFilterPrivateCF, getFilterPrivateCFSingle };