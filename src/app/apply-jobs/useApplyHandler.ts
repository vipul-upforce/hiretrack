import { useRef } from 'react';
import { FormikProps, FormikTouched } from 'formik';
import { scrollToError } from '@/lib/formUtils';

export const useApplyHandler = <T extends Record<string, unknown>>() => {
  const formikRef = useRef<FormikProps<T>>(null);

  const handleApply = async () => {
    const formik = formikRef.current;
    if (!formik) return;

    const errors = await formik.validateForm();

    const touched: Partial<Record<keyof T, boolean>> = {};
    for (const key in formik.initialValues) {
      if (
        key === 'customFields' &&
        formik.initialValues.key &&
        typeof formik.initialValues.key === 'object'
      ) {
        // Mark every key inside customFields as true
        touched[key] = true;
        Object.keys(
          formik.initialValues[key] as Record<string, unknown>,
        ).forEach((subKey) => {
          (touched[key] as unknown as Record<string, boolean>)[subKey] = true;
        });
      } else {
        touched[key] = true;
      }
    }

    formik.setTouched(touched as FormikTouched<T>, true);

    if (Object.keys(errors).length > 0) {
      scrollToError(errors);
      return;
    }

    formik.handleSubmit();
  };

  return { formikRef, handleApply };
};
