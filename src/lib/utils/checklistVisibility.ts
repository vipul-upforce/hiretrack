import { IChecklistField, IChecklist, UserRole } from '@/lib/models/JobLaneConfig';

/**
 * Filters checklist fields based on user role and visibility context
 * @param fields - Array of checklist fields
 * @param userRole - Current user's role
 * @param context - 'form' for filling forms, 'history' for viewing history
 * @returns Filtered array of fields visible to the user
 */
export function filterFieldsByRole(
  fields: IChecklistField[],
  userRole: UserRole,
  context: 'form' | 'history',
): IChecklistField[] {
  if (!fields || !Array.isArray(fields)) return [];

  return fields.filter((field) => {
    // Handle backward compatibility - if visibility arrays don't exist, show to all roles except 'candidate'
    const visibilityArray = context === 'form' ? field.visibleOnForm : field.visibleInHistory;

    if (!visibilityArray || !Array.isArray(visibilityArray)) {
      // Backward compatibility: show to admin, hr, interviewer by default
      return ['admin', 'hr', 'interviewer'].includes(userRole);
    }

    return visibilityArray.includes(userRole);
  });
}

/**
 * Filters an entire checklist based on user role and visibility context
 * @param checklist - The checklist to filter
 * @param userRole - Current user's role
 * @param context - 'form' for filling forms, 'history' for viewing history
 * @returns Filtered checklist with only visible fields, or null if no fields are visible
 */
export function filterChecklistByRole(
  checklist: IChecklist | null | undefined,
  userRole: UserRole,
  context: 'form' | 'history',
): IChecklist | null {
  if (!checklist) return null;

  const filteredFields = filterFieldsByRole(checklist.fields, userRole, context);

  // If no fields are visible, return null to indicate no checklist should be shown
  if (filteredFields.length === 0) {
    return null;
  }

  return {
    ...checklist,
    fields: filteredFields,
  };
}

/**
 * Checks if a checklist should be shown to a user based on field visibility
 * @param checklist - The checklist to check
 * @param userRole - Current user's role
 * @param context - 'form' for filling forms, 'history' for viewing history
 * @returns true if checklist should be shown, false otherwise
 */
export function shouldShowChecklist(
  checklist: IChecklist | null | undefined,
  userRole: UserRole,
  context: 'form' | 'history',
): boolean {
  return filterChecklistByRole(checklist, userRole, context) !== null;
}

/**
 * Filters checklist responses in history based on user role visibility
 * @param responses - Map of field responses
 * @param fields - Original checklist fields with visibility settings
 * @param userRole - Current user's role
 * @returns Filtered responses object with only visible fields
 */
export function filterChecklistResponses(
  responses: Record<string, any> | Map<string, any>,
  fields: IChecklistField[],
  userRole: UserRole,
): Record<string, any> {
  if (!responses || !fields) return {};

  // Convert Map to object if needed
  const responsesObj = responses instanceof Map
    ? Object.fromEntries(responses.entries())
    : responses;

  const visibleFields = filterFieldsByRole(fields, userRole, 'history');
  const visibleFieldIds = new Set(visibleFields.map((f) => f.id));

  // Filter responses to only include visible fields
  const filteredResponses: Record<string, any> = {};
  Object.entries(responsesObj).forEach(([fieldId, response]) => {
    if (visibleFieldIds.has(fieldId)) {
      filteredResponses[fieldId] = response;
    }
  });

  return filteredResponses;
}

/**
 * Validates that a user can submit responses for specific fields
 * @param fieldIds - Array of field IDs being submitted
 * @param fields - Original checklist fields with visibility settings
 * @param userRole - Current user's role
 * @returns true if all fields are visible to user, false otherwise
 */
export function validateUserCanSubmitFields(
  fieldIds: string[],
  fields: IChecklistField[],
  userRole: UserRole,
): boolean {
  const visibleFields = filterFieldsByRole(fields, userRole, 'form');
  const visibleFieldIds = new Set(visibleFields.map((f) => f.id));

  // Check if all submitted field IDs are in the visible fields
  return fieldIds.every((fieldId) => visibleFieldIds.has(fieldId));
}

/**
 * Gets user role from role string, with validation
 * @param role - Role string from user object
 * @returns UserRole or null if invalid
 */
export function getUserRole(role: string | undefined): UserRole | null {
  if (!role) return null;

  const validRoles: UserRole[] = ['admin', 'hr', 'interviewer', 'candidate'];
  return validRoles.includes(role as UserRole) ? (role as UserRole) : null;
}
