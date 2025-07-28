import CustomFieldFormList from "../List/CustomFormList";
import { CustomFieldsContext } from "../../Context";
import React, { useCallback, useContext } from "react";
import FormCustomFieldList from "../List/CustomField";
function Stepper() {
  const context = useContext(CustomFieldsContext);
  const { stepName, customFields, selectedFormId } = context;

  console.log('Stepper context:', {
    stepName,
    customFieldsKeys: Object.keys(customFields || {}),
    customFieldsCount: Object.keys(customFields || {}).length,
    selectedFormId,
    hasContext: !!context
  });

  const StepperComponent = useCallback(() => {
    console.log('Stepper rendering component for step:', stepName);
    switch (stepName) {
      case "FormList":
        return <CustomFieldFormList />;
      case "formCustomFieldList":
        return <FormCustomFieldList />;
      default:
        console.log('Unknown step name:', stepName);
        return null;
    }
  }, [stepName]);

  return <div>{StepperComponent()}</div>;
}

export default React.memo(Stepper);
