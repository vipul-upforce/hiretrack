import { useRef } from 'react';
import { FormikProps, FormikTouched, FormikValues } from 'formik';
import { scrollToError } from '@/lib/formUtils';

export const useApplyHandler = <T extends FormikValues>() => {
  const formikRef = useRef<FormikProps<T>>(null);

  const handleApply = async () => {
    const formik = formikRef.current;
    if (!formik) return;

    const errors = await formik.validateForm();

    const touched: Record<string, unknown> = {};
    for (const key in formik.initialValues) {
      if (key === 'customFields') {
        const customFieldsTouched: Record<string, boolean> = {};
        const cfValues =
          ((formik.values as Record<string, unknown>).customFields as Record<
            string,
            unknown
          >) || {};
        const cfInits =
          ((formik.initialValues as Record<string, unknown>)
            .customFields as Record<string, unknown>) || {};

        const allCfKeys = new Set([
          ...Object.keys(cfInits),
          ...Object.keys(cfValues),
        ]);

        allCfKeys.forEach((subKey) => {
          customFieldsTouched[subKey] = true;
        });
        touched[key] = customFieldsTouched;
      } else {
        touched[key] = true;
      }
    }

    formik.setTouched(touched as FormikTouched<T>, true);

    const hasErrors = (errs: Record<string, unknown>): boolean => {
      if (!errs || typeof errs !== 'object') return false;
      return Object.keys(errs).some((key) => {
        if (
          key === 'customFields' &&
          errs[key] &&
          typeof errs[key] === 'object'
        ) {
          const customFieldErrors = errs[key] as Record<string, unknown>;
          return Object.keys(customFieldErrors).length > 0;
        }
        return !!errs[key];
      });
    };

    if (hasErrors(errors)) {
      scrollToError(errors);
      return;
    }

    formik.handleSubmit();
  };

  return { formikRef, handleApply };
};
