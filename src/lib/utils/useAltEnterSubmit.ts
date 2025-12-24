import { useFormikContext } from 'formik';
import React, { useCallback } from 'react';

export const useAltEnterSubmit = () => {
  const { submitForm, isSubmitting } = useFormikContext();

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();

        // You can access the current field value via e.currentTarget.value
        const { value } = e.currentTarget;

        if (value && value.trim() && !isSubmitting) {
          submitForm(); // This triggers the Parent's handleFormSubmit
        }
      }
    },
    [submitForm, isSubmitting],
  );

  return onKeyDown;
};
