'use client';

import { Label } from '@/components/ui/label';
import { useFormikContext } from 'formik';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
import { Dayjs } from 'dayjs';
import useRoles from '@/hooks/useRoles';
import { useEffect, useRef, useMemo } from 'react';
import { RenderField } from './RenderField';

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}
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
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    getFieldProps,
    setFieldError,
    submitCount,
  } = useFormikContext<FormValues>();

  const role = useRoles();
  const { formNameObject } = useCustomForm(
    formName,
    jobId,
    undefined,
    undefined,
    // role || ""
  );

  const allFields = role !== 'candidate' && role !== '';
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

      if (fieldElement && firstErrorNormalField === 'customFields') {
        // Scroll to the field and focus it
        fieldElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
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
        // Get field props directly using getFieldProps instead of useField -- avoids "rules of hooks" violation
        const fieldProps = getFieldProps(`customFields.${field.label}`);
        const fieldError = errors.customFields?.[field.label];
        const fieldTouched =
          touched.customFields?.[field.label] === true || submitCount > 0;

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
            id={`customFields.${field.label}`}
            data-field-name={field.label}
            className="mt-2 flex flex-col gap-2 md:mt-0"
            ref={(el) => {
              fieldRefs.current[field.label] = el;
            }}
          >
            <Label htmlFor={field.label} className="font-semibold capitalize">
              {field.label.split(' |||||(')[0]}
              {field.required && (
                <span className="text-sm capitalize text-red-500">*</span>
              )}
            </Label>
            <RenderField
              getFieldProps={getFieldProps}
              label={field.label}
              setFieldValue={setFieldValue}
              setFieldTouched={setFieldTouched}
              type={field.type}
              values={values as FormValues}
              options={field.options
                ?.map((opt) => opt.trim())
                .filter((opt) => opt !== '')}
              setFieldError={setFieldError}
              fieldHook={{ fieldProps, fieldMeta }}
              isEditMode={isEditMode}
            />
            {fieldMeta.touched && fieldMeta.error && (
              <div
                className="text-xs capitalize text-red-500"
                style={{
                  marginTop: '-5px',
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
