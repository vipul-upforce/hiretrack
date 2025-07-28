"use client";

import { Label } from "@/components/ui/label";
import { RenderField } from "./RenderField";
import { FieldMetaProps, useField, useFormikContext } from "formik";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";
import useRoles from "@/hooks/useRoles";
import { useEffect, useRef } from "react";
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

const useConditionallyValidatedField = (
  name: string,
  shouldValidate: boolean
) => {
  const [field, meta, helpers] = useField({
    name,
    validate: () => {
      if (!shouldValidate) {
        return undefined;
      }
    },
  });
  return [field, meta, helpers];
};

function CustomFields({
  formName,
  isEditMode = false,
}: {
  formName: string;
  isEditMode?: boolean;
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
  // debugger;
  const allFields = role !== "candidate" && role !== "";
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  // if (!role || !formNameObject || !formNameObject.fields) {
  //   return <div>Loading...</div>;
  // }

  // console.log("⛔⛔⛔⛔⛔⛔⛔⛔ values: ", values);

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
      // console.log("firstErrorNormalField : ", firstErrorNormalField);

      if (fieldElement && firstErrorNormalField === "customFields") {
        // Scroll to the field and focus it
        fieldElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
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
      {[...formNameObject.fields]
        .sort((a, b) => {
          const aIsIndividual = a.candidateId || a.jobId;
          const bIsIndividual = b.candidateId || b.jobId;

          if (aIsIndividual && !bIsIndividual) {
            return 1;
          }
          if (!aIsIndividual && bIsIndividual) {
            return -1;
          }
          return 0;
        })
        .map((field) => {
          const shouldValidate = allFields || (!allFields && !field.private);
          const [fieldProps, fieldMeta] = useConditionallyValidatedField(
            `customFields.${field.label}`,
            shouldValidate
          );

          if (field.jobId && field.jobId !== values._id) {
            return null;
          }
          if (field.candidateId && field.candidateId !== values._id) {
            return null;
          }
          if (!allFields && field.private) {
            return null;
          }
          return (
            <div
              key={field.id}
              className="flex flex-col gap-2"
              ref={(el) => {
                fieldRefs.current[field.label] = el;
              }}
            >
              <Label htmlFor={field.label} className="capitalize">
                {field.label.split(" |||||(")[0]}
                {field.required && (
                  <span className="text-red-500 text-sm capitalize">*</span>
                )}
              </Label>
              {RenderField({
                getFieldProps,
                label: field.label,
                // formId: field.id,
                setFieldValue,
                setFieldTouched,
                type: field.type,
                values: values as FormValues,
                options: field.options
                  ?.map((opt) => opt.trim())
                  .filter((opt) => opt !== ""),
                setFieldError,
                fieldHook: { fieldProps, fieldMeta }, // Pass the field hook for additional functionality
                isEditMode,
              })}
              {(fieldMeta as FieldMetaProps<any>).touched &&
                (fieldMeta as FieldMetaProps<any>).error && (
                  <div
                    className="text-red-500 text-xs capitalize"
                    style={{
                      marginTop: "-5px",
                    }}
                  >
                    {(fieldMeta as FieldMetaProps<any>).error}
                  </div>
                )}
            </div>
          );
        })}
    </div>
  );
}

export default CustomFields;
