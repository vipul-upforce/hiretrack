import React, { useCallback, useContext } from 'react';
import CustomFieldFormList from '../List/CustomFormList';
import { CustomFieldsContext } from '../../Context';
import FormCustomFieldList from '../List/CustomField';

function Stepper() {
  const context = useContext(CustomFieldsContext);
  const { stepName } = context;

  const StepperComponent = useCallback(() => {
    switch (stepName) {
      case 'FormList':
        return <CustomFieldFormList />;
      case 'formCustomFieldList':
        return <FormCustomFieldList />;
      default:
        return null;
    }
  }, [stepName]);

  return <div>{StepperComponent()}</div>;
}

export default React.memo(Stepper);
