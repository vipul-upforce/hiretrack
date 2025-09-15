import { useCustomFields } from "./use-customFields";
import { getYupSchema } from "../utils/validations";
import { FormObject } from "../Types/CustomField";
import dayjs, { Dayjs } from "dayjs";
import useRoles from "@/hooks/useRoles";

export type FileData = {
  base64: string;
  name: string;
  type: string;
  size: number;
};

export type CustomFieldValues = {
  [key: string]:
    | string
    | string[]
    | boolean
    | File[]
    | Dayjs
    | FileData[]
    | number;
};

const useCustomForm = (
  formName: string,
  jobId?: string,
  candidateId?: string,
  fetchGlobal?: boolean
) => {
  // debugger;
  const { customFields } = useCustomFields();
  const role = useRoles();

  let formNameObject: FormObject | undefined;
  let formId: string | undefined;

  Object.entries(customFields).forEach((e) => {
    if (e[1].formName === formName) {
      formNameObject = e[1] as FormObject;
      formId = e[0];
    }
  });

  const fields = formNameObject?.fields || [];
  let filteredFields = fields;

  if (jobId) {
    filteredFields = fields.filter(
      (field) => field.jobId === jobId || !field.jobId
    );
  } else if (candidateId) {
    filteredFields = fields.filter(
      (field) => field.candidateId === candidateId || !field.candidateId
    );
  } else if (fetchGlobal) {
    filteredFields = fields.filter(
      (field) => !field.jobId && !field.candidateId
    );
  }

  const validationSchema = getYupSchema(
    filteredFields,
    role === "" ? "candidate" : role || undefined
  );

  const initialValues = filteredFields.reduce(
    (acc, field) => {
      if (field.type === "date") {
        acc[field.label] = field.defaultValue || dayjs().format("YYYY-MM-DD");
      } else if (field.type === "time") {
        acc[field.label] = field.defaultValue || dayjs().format("HH:mm");
      } else if (field.type === "datetime") {
        acc[field.label] =
          field.defaultValue || dayjs().format("YYYY-MM-DDTHH:mm:ss");
      } else {
        acc[field.label] = field.defaultValue || "";
      }
      return acc;
    },
    {} as Record<
      string,
      string | string[] | boolean | File[] | Dayjs | FileData[]
    >
  );

  const getDefaultValues = (formValues: CustomFieldValues) => {
    if (!initialValues) return {};

    // Create a copy of initialValues to avoid modifying the original
    const filteredValues = { ...initialValues };

    // Only include values for fields that are in our filtered list
    // This ensures job-specific fields are only included when relevant
    const fieldLabels = filteredFields.map((field) => field.label);

    Object.keys(formValues).forEach((key) => {
      // Only process this field if it's in our filtered fields list
      if (fieldLabels.includes(key)) {
        if (
          (typeof formValues[key] === "string" && formValues[key] !== "") ||
          (typeof formValues[key] === "object" &&
            Object.entries(formValues[key]).length > 0) ||
          (Array.isArray(formValues[key]) && formValues[key].length > 0)
        ) {
          filteredValues[key] = formValues[key];
        }
      }
    });

    return filteredValues;
  };

  return {
    formNameObject,
    formId,
    validationSchema,
    initialValues,
    getDefaultValues,
  };
};

export default useCustomForm;
