import type { IChecklistField } from '@/lib/models/JobLaneConfig';
import type { ChecklistHistoryResponseItem } from '@/types/checklist';

/**
 * Field type strings that use the same validation rules as in the dialog.
 */
type ChecklistFieldType = IChecklistField['type'];

type ChecklistValidationField = {
  type: ChecklistFieldType;
  options?: string[];
};

/** Checkbox with option list stores string[]; single checkbox stores label string or null. */
function isMultiOptionCheckbox(field: ChecklistValidationField): boolean {
  return (
    field.type === 'checkbox' &&
    Array.isArray(field.options) &&
    field.options.length > 0
  );
}

function isSingleCheckboxChecked(
  value: ChecklistHistoryResponseItem['value'],
): boolean {
  if (value === null || value === undefined || value === false || value === '') {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  return Boolean(value);
}

/**
 * Determines if a checklist field response is empty (for required validation).
 */
export function isChecklistFieldEmpty(
  field: ChecklistValidationField,
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
      return (
        typeof response.value !== 'string' || response.value.trim() === ''
      );
    case 'multiSelect':
      return (
        !Array.isArray(response.value) || response.value.length === 0
      );
    case 'checkbox':
      if (isMultiOptionCheckbox(field)) {
        return (
          !Array.isArray(response.value) || response.value.length === 0
        );
      }
      return !isSingleCheckboxChecked(response.value);
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
  field: ChecklistValidationField,
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
    case 'select':
    case 'radio':
      return (
        typeof response.value === 'string' && response.value.trim() !== ''
      );
    case 'multiSelect':
      return (
        Array.isArray(response.value) && response.value.length > 0
      );
    case 'checkbox':
      if (isMultiOptionCheckbox(field)) {
        return (
          Array.isArray(response.value) && response.value.length > 0
        );
      }
      return isSingleCheckboxChecked(response.value);
    case 'file':
      return (
        Array.isArray(response.value) && response.value.length > 0
      );
    default:
      return !!response.value;
  }
}
