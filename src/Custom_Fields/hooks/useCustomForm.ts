import dayjs, { Dayjs } from 'dayjs';
import useRoles from '@/hooks/useRoles';
import { useCustomFields } from './use-customFields';
import { getYupSchema } from '../utils/validations';
import { FormObject } from '../Types/CustomField';

export type FileData = {
  base64: string;
  name: string;
  type: string;
  size: number;
};

export type CustomFieldValues = {
  [key: string]:
    | string
    | string[]
    | boolean
    | File[]
    | Dayjs
    | FileData[]
    | number;
};

const useCustomForm = (
  formName: string,
  jobId?: string,
  candidateId?: string,
  fetchGlobal?: boolean,
) => {
  // debugger;
  const { customFields, isLoading, isReady } = useCustomFields();
  const role = useRoles();

  let formNameObject: FormObject | undefined;
  let formId: string | undefined;

  Object.entries(customFields).forEach((e) => {
    if (e[1].formName === formName) {
      formNameObject = e[1] as FormObject;
      [formId] = e;
    }
  });

  const fields = formNameObject?.fields || [];
  let filteredFields = fields;

  // For new candidates (no candidateId) in a job context (with jobId)
  if (jobId && !candidateId) {
    filteredFields = fields.filter(
      (field) =>
        // Include job-specific fields for this job
        (field.jobId === jobId && !field.candidateId) ||
        // Include global fields (no jobId, no candidateId)
        (!field.jobId && !field.candidateId),
    );
  }
  // For existing candidates (with candidateId)
  else if (candidateId) {
    filteredFields = fields.filter(
      (field) =>
        // Include candidate-specific fields for this candidate
        field.candidateId === candidateId ||
        // Include job-specific fields if we have a jobId
        (jobId && field.jobId === jobId && !field.candidateId) ||
        // Include global fields (no jobId, no candidateId)
        (!field.jobId && !field.candidateId),
    );
  }
  // For global fields only (fetchGlobal is true)
  else if (fetchGlobal) {
    filteredFields = fields.filter(
      (field) => !field.jobId && !field.candidateId,
    );
  }
  // Default case - include all fields that don't have specific restrictions
  else {
    filteredFields = fields;
  }

  const validationSchema = getYupSchema(
    filteredFields,
    role === '' ? 'candidate' : role || undefined,
  );

  const initialValues = filteredFields.reduce(
    (acc, field) => {
      if (field.type === 'date') {
        acc[field.label] = field.defaultValue || dayjs().format('YYYY-MM-DD');
      } else if (field.type === 'time') {
        acc[field.label] = field.defaultValue || dayjs().format('HH:mm');
      } else if (field.type === 'datetime') {
        acc[field.label] =
          field.defaultValue || dayjs().format('YYYY-MM-DDTHH:mm');
      } else {
        acc[field.label] = field.defaultValue || '';
      }
      return acc;
    },
    {} as Record<
      string,
      string | string[] | boolean | File[] | Dayjs | FileData[]
    >,
  );

  const getDefaultValues = (formValues: CustomFieldValues) => {
    // If context is still loading or not ready, preserve all existing values
    // This prevents data loss on page reload
    if (isLoading || !isReady) {
      return { ...formValues };
    }

    // If no initial values, return empty object
    if (!initialValues || filteredFields.length === 0) {
      // But still preserve existing values if context is ready but no fields defined
      return { ...formValues };
    }

    // Create a copy of initialValues to avoid modifying the original
    const filteredValues: CustomFieldValues = { ...initialValues };

    // Preserve all existing values to prevent data loss
    // This handles cases where field was deleted from metadata but still has values
    Object.keys(formValues).forEach((key) => {
      // Check if value is non-empty
      const hasValue =
        (typeof formValues[key] === 'string' && formValues[key] !== '') ||
        (typeof formValues[key] === 'object' &&
          formValues[key] !== null &&
          Object.entries(formValues[key]).length > 0) ||
        (Array.isArray(formValues[key]) && formValues[key].length > 0);

      if (hasValue) {
        // Preserve value whether it's in metadata or not
        // This prevents data loss if field was deleted from metadata
        filteredValues[key] = formValues[key];
      }
    });

    return filteredValues;
  };

  return {
    formNameObject,
    formId,
    validationSchema,
    initialValues,
    getDefaultValues,
  };
};

export default useCustomForm;
