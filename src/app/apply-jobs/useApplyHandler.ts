import { useRef } from "react";
import { FormikProps } from "formik";

export const useApplyHandler = <T extends Record<string, any>>() => {
  const formikRef = useRef<FormikProps<T>>(null);

  // const handleApply = async () => {
  //   const formik = formikRef.current;
  //   if (!formik) return;

  //   const errors = await formik.validateForm();

  //   const touched: Partial<Record<keyof T, boolean>> = {};
  //   for (const key in formik.initialValues) {
  //     touched[key] = true;
  //   }

  //   formik.setTouched(touched as any, true);

  //   const firstErrorKey = Object.keys(errors)[0];
  //   if (firstErrorKey) {
  //     const el = document.querySelector(`[id="${firstErrorKey}"]`);
  //     el?.scrollIntoView({ behavior: "smooth", block: "center" });
  //     (el as HTMLElement)?.focus();
  //     return;
  //   }

  //   formik.handleSubmit();
  // };
  const handleApply = async () => {
    const formik = formikRef.current;
    if (!formik) return;
  
    const errors = await formik.validateForm();
  
    const touched: Partial<Record<keyof T, any>> = {};
    for (const key in formik.initialValues) {
      if (key === "customFields" && formik.initialValues[key] && typeof formik.initialValues[key] === "object") {
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
      const el = document.querySelector(`[id="${firstErrorKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement)?.focus();
      return;
    }
  
    formik.handleSubmit();
  };
  
  return { formikRef, handleApply };
};
