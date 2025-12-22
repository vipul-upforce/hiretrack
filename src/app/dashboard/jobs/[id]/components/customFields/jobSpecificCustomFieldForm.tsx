import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { CustomField } from '@/Custom_Fields/Types/CustomField';
import { useContext, useEffect, useMemo } from 'react';
import JobSpecificCustomFieldFormWrapper from './JobSpecificCustomFIeldFormWrapper';

export default function JobSpecificCustomFieldForm({
  isOpen,
  onClose,
  jobId,
  formId,
  initialValue,
  isEditMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  formId: string;
  initialValue?: CustomField;
  isEditMode: boolean;
}) {
  const context = useContext(CustomFieldsContext);
  const { setSelectedFormId, customFields } = context;

  // Set up the form context for job-specific fields
  useEffect(() => {
    if (isOpen && customFields && formId) {
      const candidateForm = customFields[formId];
      if (candidateForm) {
        setSelectedFormId({
          formId,
          formName: candidateForm.formName,
          fields: candidateForm.fields,
        });
      }
    }
  }, [isOpen, customFields, formId, setSelectedFormId]);

  // Create a modified initial value with jobId
  const jobSpecificInitialValue = useMemo(() => {
    if (initialValue) {
      return initialValue;
    }
    return {
      id: '',
      label: '',
      type: 'text',
      options: [],
      persistance: 'permanent',
      defaultValue: '',
      required: false,
      private: false,
      privateInt: false,
      showOnCard: false,
      jobId, // Add jobId to make it job-specific
    };
  }, [initialValue, jobId]);

  return (
    <JobSpecificCustomFieldFormWrapper
      isOpen={isOpen}
      handleClose={onClose}
      initialValue={jobSpecificInitialValue as CustomField}
      isEditMode={isEditMode}
      jobId={jobId}
    />
  );
}
