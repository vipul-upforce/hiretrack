import { useRef } from "react";
import { FormikProps } from "formik";

export const useApplyHandler = <T extends Record<string, any>>() => {
  const formikRef = useRef<FormikProps<T>>(null);

  const handleApply = async () => {
    const formik = formikRef.current;
    if (!formik) return;

    const errors = await formik.validateForm();
    // ✅ Log full errors object
    if (Object.keys(errors).length > 0) {
      console.error("Validation Errors:", errors);
    }
    const touched: Partial<Record<keyof T, any>> = {};
    for (const key in formik.initialValues) {
      if (
        key === "customFields" &&
        formik.initialValues[key] &&
        typeof formik.initialValues[key] === "object"
      ) {
        // Mark every key inside customFields as true
        touched[key] = {};
        Object.keys(formik.initialValues[key]).forEach((subKey) => {
          touched[key][subKey] = true;
        });
      } else {
        touched[key] = true;
      }
    }

    formik.setTouched(touched as any, true);

    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      if (firstErrorKey === "customFields") {
        if (!errors.customFields) return;
        const cfKey = Object.keys(errors.customFields)[0];
        const el = document.querySelector(`[id="${firstErrorKey}.${cfKey}"]`);
        if (el) {
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          (el as HTMLElement)?.focus();
        }
        
        return;
      }
      const el = document.querySelector(`[id="${firstErrorKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      (el as HTMLElement)?.focus();
      return;
    }

    formik.handleSubmit();
  };

  return { formikRef, handleApply };
};
