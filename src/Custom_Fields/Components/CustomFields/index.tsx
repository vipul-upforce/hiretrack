"use client";
// import { FormLabel } from "@mui/material";
import { Label } from "@/components/ui/label";
import { RenderField } from "./RenderField";
import { useFormikContext } from "formik";
import useCustomForm from "@/Custom_Fields/hooks/useCustomForm";
import { Dayjs } from "dayjs";
import useRoles from "@/hooks/useRoles";
// import { useEffect } from "react";

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
    touched,
    errors,
    setFieldValue,
    setFieldTouched,
    getFieldProps,
    setFieldError,
  } = useFormikContext<FormValues>();

  const { formNameObject } = useCustomForm(formName);
  const role = useRoles();
  const allFields = role !== "interviewer" && role !== "candidate";

  if (
    !formNameObject ||
    !formNameObject.fields ||
    Object.keys(formNameObject.fields).length === 0
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <hr className="pt-2" />
      <div className="font-bold text-lg py-2">Meta Fields</div>
      {formNameObject?.fields
        ?.filter((field) => allFields || (!allFields && !field.private))
        .map((field) => (
          <div key={field.id} className="flex flex-col gap-2">
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
            })}
            {touched?.customFields?.[field.label] &&
              errors?.customFields?.[field.label] && (
                <div
                  className="text-red-500 text-xs capitalize"
                  style={{
                    marginTop: "-5px",
                  }}
                >
                  {errors.customFields[field.label] as string}
                </div>
              )}
          </div>
        ))}
    </div>
  );
}

export default CustomFields;
