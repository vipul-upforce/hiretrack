import * as Yup from "yup";
import { CustomField } from "../Types/CustomField";

export const validationSchema = Yup.object({
  label: Yup.string()
    .required("Label is required")
    .max(50, "Label must be 50 characters or less")
    .trim(),
  type: Yup.string().required("Field type is required"),
  private: Yup.boolean(),
  options: Yup.array()
    .of(Yup.string())
    .when(["type"], ([type]) => {
      if (["select", "multiSelect", "radio", "checkbox"].includes(type)) {
        return Yup.array()
          .of(Yup.string())
          .min(1, "Options are required for this field type")
          .required();
      }
      return Yup.array().of(Yup.string()).notRequired();
    }),
  defaultValue: Yup.string().when(["type"], ([type]) => {
    if (["select", "radio"].includes(type)) {
      return Yup.string();
    }
    if (type === "multiSelect" || type === "checkbox") {
      return Yup.array().of(Yup.string());
    }
    return Yup.string().notRequired();
  }),
});

export const getYupSchema = (fields: CustomField[]) => {
  const schemaFields: Record<string, Yup.Schema<unknown>> = {};

  fields.forEach((field) => {
    let validator: Yup.Schema<unknown>;
    switch (field.type) {
      case "number":
        validator = Yup.number().typeError(`${field.label} must be a number`);
        break;
      case "select":
      case "radio":
        validator = Yup.string().oneOf(
          field.options || [],
          `${field.label} must be one of ${field.options?.join(", ")}`
        );
        break;
      case "multiSelect":
      case "checkbox":
        validator = Yup.array()
          .of(
            Yup.string().oneOf(
              field.options || [],
              `${field.label} must be one of ${field.options?.join(", ")}`
            )
          )
          .min(field.required ? 1 : 0, `${field.label} is required`);
        break;
      case "date":
        validator = Yup.date().typeError(`${field.label} must be a valid date`);
        break;
      case "datetime":
        validator = Yup.date().typeError(
          `${field.label} must be a valid datetime`
        );
        break;
      case "time":
        validator = Yup.string();
        break;
      case "file":
        validator = Yup.mixed();
        break;
      case "textarea":
      case "text":
      default:
        validator = Yup.string();
        break;
    }

    if (field.required) {
      validator = validator.required(`${field.label} is required`);
    }

    schemaFields[field.label] = validator;
  });

  return Yup.object(schemaFields);
};
