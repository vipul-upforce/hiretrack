import type { IChecklistField } from '@/lib/models/JobLaneConfig';
import type { ChecklistHistoryResponseItem } from '@/types/checklist';

/**
 * Field type strings that use the same validation rules as in the dialog.
 */
type ChecklistFieldType = IChecklistField['type'];

/**
 * Determines if a checklist field response is empty (for required validation).
 */
export function isChecklistFieldEmpty(
  field: { type: ChecklistFieldType },
  response: ChecklistHistoryResponseItem | undefined,
): boolean {
  if (
    !response ||
    response.value === undefined ||
    response.value === null
  ) {
    return true;
  }

  switch (field.type) {
    case 'text':
    case 'email':
    case 'textarea':
    case 'password':
      return !response.value || (response.value as string).trim() === '';
    case 'number':
      return (
        response.value === '' || Number.isNaN(Number(response.value))
      );
    case 'date':
    case 'datetime':
      if (
        !response.value ||
        response.value === '' ||
        response.value === null
      ) {
        return true;
      }
      try {
        const dateObj =
          response.value instanceof Date
            ? response.value
            : new Date(response.value as string);
        return (
          Number.isNaN(dateObj.getTime()) || dateObj.getTime() <= 0
        );
      } catch {
        return true;
      }
    case 'time':
      return (
        !response.value ||
        response.value === '' ||
        (response.value as string).trim() === ''
      );
    case 'select':
    case 'radio':
      return !response.value || response.value === '';
    case 'multiSelect':
    case 'checkbox':
      return (
        !Array.isArray(response.value) || response.value.length === 0
      );
    case 'file':
      return (
        !Array.isArray(response.value) || response.value.length === 0
      );
    default:
      return !response.value;
  }
}

/**
 * Determines if a checklist field response is valid (for clearing errors in real-time).
 */
export function isChecklistFieldValueValid(
  field: { type: ChecklistFieldType },
  response: ChecklistHistoryResponseItem | undefined,
): boolean {
  if (
    !response ||
    response.value === undefined ||
    response.value === null
  ) {
    return false;
  }

  switch (field.type) {
    case 'date':
    case 'datetime':
      if (
        !response.value ||
        response.value === '' ||
        response.value === null
      ) {
        return false;
      }
      try {
        const dateObj =
          response.value instanceof Date
            ? response.value
            : new Date(response.value as string);
        return (
          !Number.isNaN(dateObj.getTime()) && dateObj.getTime() > 0
        );
      } catch {
        return false;
      }
    case 'time':
      return (
        (response.value as string) !== '' &&
        (response.value as string).trim() !== ''
      );
    case 'text':
    case 'email':
    case 'textarea':
    case 'password':
      return (response.value as string).trim() !== '';
    case 'number':
      return (
        response.value !== '' && !Number.isNaN(Number(response.value))
      );
    case 'multiSelect':
    case 'checkbox':
      return (
        Array.isArray(response.value) && response.value.length > 0
      );
    case 'file':
      return (
        Array.isArray(response.value) && response.value.length > 0
      );
    default:
      return !!response.value;
  }
}
