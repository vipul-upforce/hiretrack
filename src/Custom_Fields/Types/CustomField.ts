export type FormObject = {
  fields: CustomField[];
  formName: string;
};

export type SelectedFormObject = {
  formId: string;
  fields: CustomField[];
  formName: string;
};

export type CustomFields = {
  [key: string]: FormObject;
};

export type RegulerFormProps = {
  setIsOpen: () => void;
};

export interface CustomField {
  id: string;
  label: string;
  type: Types;
  options?: string[];
  candidateId?: string;
  jobId?: string;
  persistance: Persistance;
  defaultValue?: string | string[];
  required: boolean;
  private: boolean;
  showOnCard?: boolean;
}

export type CustomFieldFormProps = {
  isOpen: boolean;
  handleClose: () => void;
  initialValue?: CustomField | null;
  existingFields?: CustomField[];
};

export type Types =
  | "text"
  | "number"
  | "email"
  | "password"
  | "date"
  | "time"
  | "datetime"
  | "checkbox"
  | "radio"
  | "select"
  | "multiSelect"
  | "textarea"
  | "file";

export type Persistance = "permanent" | "temporary";
