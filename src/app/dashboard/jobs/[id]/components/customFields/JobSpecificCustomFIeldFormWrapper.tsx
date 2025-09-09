import CustomFieldForm from "@/Custom_Fields/Components/Form/CustomFieldForm";
import { CustomFieldsContext } from "@/Custom_Fields/Context";
import { useContext, useMemo, useState } from "react";

export default function JobSpecificCustomFieldFormWrapper({
  isOpen,
  handleClose,
  initialValue,
  isEditMode,
  jobId,
  formId,
}: {
  isOpen: boolean;
  handleClose: () => void;
  initialValue: any;
  isEditMode: boolean;
  jobId: string;
  formId: string;
}) {
  const context = useContext(CustomFieldsContext);
  const { handleAddCustomField, handleEditCustomField } = context;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Override the context methods to add jobId
  const jobSpecificContext = useMemo(
    () => ({
      ...context,
      handleAddCustomField: (field: any, selectedFormId: string | null) => {
        const jobSpecificField = {
          ...field,
          jobId: jobId,
        };
        handleAddCustomField(jobSpecificField, selectedFormId);
      },
      handleEditCustomField: (field: any, selectedFormId: string | null) => {
        const jobSpecificField = {
          ...field,
          jobId: jobId,
        };
        handleEditCustomField(jobSpecificField, selectedFormId);
      },
    }),
    [context, handleAddCustomField, handleEditCustomField, jobId]
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
