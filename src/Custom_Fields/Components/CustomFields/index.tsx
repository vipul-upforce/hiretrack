"use client";

import { Label } from "@/components/ui/label";
import { RenderField } from "./RenderField";
import { useField, useFormikContext } from "formik";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";
import useRoles from "@/hooks/useRoles";
import { useEffect, useRef } from "react";

interface FormValues {
  customFields: {
    [key: string]:
      | string
      | number
      | boolean
      | string[]
      | FileData[]
      | Dayjs
      | number;
  };
}

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

function CustomFields({ formName }: { formName: string }) {
  const {
    values,
    // touched,
    errors,
    setFieldValue,
    setFieldTouched,
    getFieldProps,
    setFieldError,
    submitCount,
  } = useFormikContext<FormValues>();

  const { formNameObject } = useCustomForm(formName);
  const role = useRoles();
  const allFields = role !== "interviewer";
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Create useField hooks for each custom field
  const customFieldHooks: { [key: string]: any } = {};

  if (formNameObject?.fields) {
    formNameObject.fields
      .filter((field) => allFields || (!allFields && !field.private))
      .forEach((field) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [fieldProps, fieldMeta] = useField(`customFields.${field.label}`);
        customFieldHooks[field.label] = { fieldProps, fieldMeta };
      });
  }

  // Focus on first field with error only after form submission
  useEffect(() => {
    if (
      submitCount > 0 &&
      errors.customFields &&
      Object.keys(errors.customFields).length > 0
    ) {
      const firstErrorNormalField = Object.keys(errors)[0];
      const firstErrorField = Object.keys(errors.customFields)[0];
      const fieldElement = fieldRefs.current[firstErrorField];
      console.log("firstErrorNormalField : ", firstErrorNormalField);

      if (fieldElement && firstErrorNormalField === "customFields") {
        // Scroll to the field and focus it
        fieldElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Focus the input element
        const inputElement = fieldElement.querySelector(
          "input, textarea, select"
        ) as HTMLElement;
        if (inputElement && typeof inputElement.focus === "function") {
          setTimeout(() => {
            inputElement.focus();
          }, 100);
        }
      }
    }
  }, [submitCount]);

  if (
    !formNameObject ||
    !formNameObject.fields ||
    Object.keys(formNameObject.fields).length === 0
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {formNameObject?.fields
        ?.filter((field) => allFields || (!allFields && !field.private))
        .map((field) => {
          const fieldHook = customFieldHooks[field.label];

          return (
            <div
              key={field.id}
              className="flex flex-col gap-2"
              ref={(el) => {
                fieldRefs.current[field.label] = el;
              }}
            >
              <Label htmlFor={field.label} className="capitalize">
                {field.label}
                {field.required && (
                  <span className="text-red-500 text-sm capitalize">*</span>
                )}
              </Label>
              {RenderField({
                getFieldProps,
                label: field.label,
                setFieldValue,
                setFieldTouched,
                type: field.type,
                values: values as FormValues,
                options: field.options
                  ?.map((opt) => opt.trim())
                  .filter((opt) => opt !== ""),
                setFieldError,
                fieldHook, // Pass the field hook for additional functionality
              })}
              {fieldHook?.fieldMeta.touched && fieldHook?.fieldMeta.error && (
                <div
                  className="text-red-500 text-xs capitalize"
                  style={{
                    marginTop: "-5px",
                  }}
                >
                  {fieldHook.fieldMeta.error}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

export default CustomFields;
