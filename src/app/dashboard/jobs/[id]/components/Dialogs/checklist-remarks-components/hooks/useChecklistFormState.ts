import type { ChecklistFieldChangeHandler, ChecklistHistoryResponseItem } from '@/types/checklist';
import { useState, useEffect, useCallback } from 'react';
import type { ChecklistInfo } from '../types';
import {
  isChecklistFieldEmpty,
  isChecklistFieldValueValid,
} from '../utils/checklistValidation';

export interface UseChecklistFormStateParams {
  parsedChecklistInfo: ChecklistInfo | null;
  hasChecklist: boolean;
}

export interface UseChecklistFormStateResult {
  checklistResponses: Record<string, ChecklistHistoryResponseItem>;
  setChecklistResponses: React.Dispatch<
    React.SetStateAction<Record<string, ChecklistHistoryResponseItem>>
  >;
  fieldErrors: Record<string, string>;
  fieldTouched: Record<string, boolean>;
  handleChecklistFieldChange: ChecklistFieldChangeHandler;
  validateChecklist: () => boolean;
}

/**
 * Manages checklist form state: responses, errors, touched, validation, and field change handler.
 */
export function useChecklistFormState({
  parsedChecklistInfo,
  hasChecklist,
}: UseChecklistFormStateParams): UseChecklistFormStateResult {
  const [checklistResponses, setChecklistResponses] = useState<
    Record<string, ChecklistHistoryResponseItem>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

  // Initialize checklist responses when checklist is present
  useEffect(() => {
    if (!hasChecklist || !parsedChecklistInfo?.checklist) return;

    const initialResponses: Record<string, ChecklistHistoryResponseItem> = {};
    parsedChecklistInfo.checklist.fields.forEach((field) => {
      initialResponses[field.id] = {
        value: field.type === 'checkbox' ? false : '',
        fieldLabel: field.label,
        fieldType: field.type,
        visibleInHistory: field.visibleInHistory,
      };
    });

    setChecklistResponses(initialResponses);
    setFieldErrors({});
    setFieldTouched({});
  }, [hasChecklist, parsedChecklistInfo]);

  // Real-time validation: clear errors when required fields become valid
  useEffect(() => {
    if (!hasChecklist || !parsedChecklistInfo?.checklist) return;

    const currentErrors = { ...fieldErrors };
    let hasChanges = false;

    for (const field of parsedChecklistInfo.checklist.fields) {
      if (field.required && currentErrors[field.id] && fieldTouched[field.id]) {
        const response = checklistResponses[field.id];
        if (isChecklistFieldValueValid(field, response)) {
          delete currentErrors[field.id];
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setFieldErrors(currentErrors);
    }
  }, [
    checklistResponses,
    fieldErrors,
    fieldTouched,
    hasChecklist,
    parsedChecklistInfo,
  ]);

  const handleChecklistFieldChange: ChecklistFieldChangeHandler = useCallback(
    (fieldId, value, files) => {
      setFieldTouched((prev) => ({ ...prev, [fieldId]: true }));

      const field = parsedChecklistInfo?.checklist?.fields.find(
        (f) => f.id === fieldId,
      );
      setChecklistResponses((prev) => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          value,
          ...(files !== undefined && { files }),
          fieldLabel: field?.label ?? fieldId,
          fieldType: field?.type ?? 'text',
          visibleInHistory: field?.visibleInHistory ?? [],
        },
      }));

      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    },
    [parsedChecklistInfo?.checklist?.fields],
  );

  const validateChecklist = useCallback((): boolean => {
    if (!hasChecklist || !parsedChecklistInfo?.checklist) return true;

    const checklist = parsedChecklistInfo.checklist;
    const errors: Record<string, string> = {};
    let hasErrors = false;

    for (const field of checklist.fields) {
      if (!field.required) continue;
      const response = checklistResponses[field.id];
      if (isChecklistFieldEmpty(field, response)) {
        errors[field.id] = `${field.label} is required`;
        hasErrors = true;
      }
    }

    if (hasErrors) {
      const touchedState: Record<string, boolean> = {};
      for (const field of checklist.fields) {
        if (field.required) touchedState[field.id] = true;
      }
      setFieldTouched((prev) => ({ ...prev, ...touchedState }));
    }
    setFieldErrors(errors);
    return !hasErrors;
  }, [
    hasChecklist,
    parsedChecklistInfo?.checklist,
    checklistResponses,
  ]);

  return {
    checklistResponses,
    setChecklistResponses,
    fieldErrors,
    fieldTouched,
    handleChecklistFieldChange,
    validateChecklist,
  };
}
