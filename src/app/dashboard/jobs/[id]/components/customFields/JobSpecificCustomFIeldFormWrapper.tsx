import CustomFieldForm from '@/Custom_Fields/Components/Form/CustomFieldForm';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { CustomField } from '@/Custom_Fields/Types/CustomField';
import { useContext, useMemo } from 'react';

export default function JobSpecificCustomFieldFormWrapper({
  isOpen,
  handleClose,
  initialValue,
  isEditMode,
  jobId,
}: {
  isOpen: boolean;
  handleClose: () => void;
  initialValue: CustomField;
  isEditMode: boolean;
  jobId: string;
}) {
  const context = useContext(CustomFieldsContext);
  const { handleAddCustomField, handleEditCustomField } = context;

  // Override the context methods to add jobId
  const jobSpecificContext = useMemo(
    () => ({
      ...context,
      handleAddCustomField: (
        field: CustomField,
        selectedFormId: string | null,
      ) => {
        const jobSpecificField = {
          ...field,
          jobId,
        };
        handleAddCustomField(jobSpecificField, selectedFormId);
      },
      handleEditCustomField: (
        field: CustomField,
        selectedFormId: string | null,
      ) => {
        const jobSpecificField = {
          ...field,
          jobId,
        };
        handleEditCustomField(jobSpecificField, selectedFormId);
      },
    }),
    [context, handleAddCustomField, handleEditCustomField, jobId],
  );

  return (
    <CustomFieldsContext.Provider value={jobSpecificContext}>
      <CustomFieldForm
        isOpen={isOpen}
        handleClose={handleClose}
        initialValue={initialValue}
        isEditMode={isEditMode}
      />
    </CustomFieldsContext.Provider>
  );
}
