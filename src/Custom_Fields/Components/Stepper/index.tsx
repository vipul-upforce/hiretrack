import CustomFieldFormList from "../List/CustomFormList";
import { CustomFieldsContext } from "../../Context";
import React, { useCallback, useContext } from "react";
import FormCustomFieldList from "../List/CustomField";
function Stepper() {
  const { stepName } = useContext(CustomFieldsContext);

  const StepperComponent = useCallback(() => {
    switch (stepName) {
      case "FormList":
        return <CustomFieldFormList />;
      case "formCustomFieldList":
        return <FormCustomFieldList />;
      default:
        return null;
    }
  }, [stepName]);

  return <div>{StepperComponent()}</div>;
}

export default React.memo(Stepper);
