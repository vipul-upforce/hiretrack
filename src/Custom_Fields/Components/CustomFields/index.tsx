"use client";

import { Label } from "@/components/ui/label";
import { RenderField } from "./RenderField";
import { FieldMetaProps, useField, useFormikContext } from "formik";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";
import useRoles from "@/hooks/useRoles";
import { useEffect, useRef, useMemo } from "react";
import { CustomField } from "@/Custom_Fields/Types/CustomField";

interface FormValues {
  _id?: string;
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

// Convert the hook to a regular validation function
const createFieldValidator = (shouldValidate: boolean) => {
  return () => {
    if (!shouldValidate) {
      return undefined;
    }
    // Add any other validation logic here if needed
    return undefined;
  };
};

function CustomFields({
  formName,
  isEditMode = false,
  jobId,
}: {
  formName: string;
  isEditMode?: boolean;
  jobId?: string;
}) {
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

  const role = useRoles();
  // debugger;
  const { formNameObject } = useCustomForm(
    formName,
    undefined,
    undefined,
    undefined
    // role || ""
  );

  new Promise(() => {
    setTimeout(() => {}, 1000);
  });

  const allFields = role !== "candidate" && role !== "";
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Pre-calculate all fields that will be rendered
  const fieldsToRender = useMemo(() => {
    if (!formNameObject?.fields) return [];

    return formNameObject.fields.filter((field) => {
      // For job-specific fields, check against the provided jobId
      if (field.jobId && field.jobId !== jobId) {
        return false;
      }
      // For candidate-specific fields, check against the candidate ID
      if (field.candidateId && field.candidateId !== values._id) {
        return false;
      }
      // Hide private fields from candidates
      if (!allFields && field.private) {
        return false;
      }
      // Show global fields (no jobId or candidateId) and matching job-specific fields
      return true;
    });
  }, [formNameObject?.fields, values._id, allFields, jobId]);

  // Create field hooks for ALL potential fields at the top level
  // This ensures consistent hook order regardless of which fields are rendered
  const fieldHooks = useMemo(() => {
    const hooks: { [key: string]: any } = {};

    if (formNameObject?.fields) {
      formNameObject.fields.forEach((field) => {
        const shouldValidate = allFields || (!allFields && !field.private);
        hooks[field.label] = {
          shouldValidate,
          validator: createFieldValidator(shouldValidate),
        };
      });
    }

    return hooks;
  }, [formNameObject?.fields, allFields]);

  // Call useField for ALL potential fields (not just visible ones)
  // This maintains consistent hook order
  const allFieldStates = useMemo(() => {
    const states: { [key: string]: [any, any] } = {};

    if (formNameObject?.fields) {
      formNameObject.fields.forEach((field) => {
        const shouldValidate = allFields || (!allFields && !field.private);
        // We need to call useField for each field, but we can't do it here in useMemo
        // Let's restructure this differently
      });
    }

    return states;
  }, [formNameObject?.fields, allFields]);

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

      // debugger;

      if (fieldElement && firstErrorNormalField === "customFields") {
        // Scroll to the field and focus it
        fieldElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });

        // // Focus the input element
        // const inputElement = fieldElement.querySelector(
        //   "input, textarea, select"
        // ) as HTMLElement;
        // if (inputElement && typeof inputElement.focus === "function") {
        //   setTimeout(() => {
        //     // inputElement.focus();
        //   }, 100);
        // }
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
      {fieldsToRender.map((field) => {
        const shouldValidate = allFields || (!allFields && !field.private);

        // Get field props directly using getFieldProps instead of useField -- avoids "rules of hooks" violation
        const fieldProps = getFieldProps(`customFields.${field.label}`);
        const fieldError = errors.customFields?.[field.label];
        const fieldTouched = submitCount > 0;

        // Create a mock fieldMeta object similar to what useField would return
        const fieldMeta = {
          touched: fieldTouched,
          error: fieldError,
          initialTouched: false,
          initialError: undefined,
          initialValue: undefined,
          value: fieldProps.value,
        };

        return (
          <div
            key={field.id}
            className="flex flex-col gap-2 mt-2 md:mt-0"
            ref={(el) => {
              fieldRefs.current[field.label] = el;
            }}
          >
            <Label htmlFor={field.label} className="capitalize font-semibold">
              {field.label.split(" |||||(")[0]}
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
              fieldHook: { fieldProps, fieldMeta },
              isEditMode,
            })}
            {fieldMeta.touched && fieldMeta.error && (
              <div
                className="text-red-500 text-xs capitalize"
                style={{
                  marginTop: "-5px",
                }}
              >
                {fieldMeta.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CustomFields;
