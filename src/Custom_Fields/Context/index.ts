import { createContext } from "react";
import {
  CustomField,
  CustomFields,
  SelectedFormObject,
} from "../Types/CustomField";

// Define the shape of your context state
export type CustomFieldsContextType = {
  customFields: CustomFields;
  setCustomFields: (fields: CustomFields) => void;
  handleAddFormId: (formName: string) => void;
  handleEditFormId: (formId: string, formName: string) => void;
  handleDeleteFormId: (formId: string) => void;
  stepName: string;
  setStepName: (name: string) => void;
  selecteFormIdTarget: (formId: string) => void;
  selectedFormId: SelectedFormObject | null;
  handleAddCustomField: (
    customField: CustomField,
    formId: string | null
  ) => void;
  handleEditCustomField: (
    customField: CustomField,
    formId: string | null
  ) => void;
  handleDeleteCustomField: (
    customFieldID: string,
    formId: string | null
  ) => void;
  deleteFormIDAllCustomFields: (formId: string) => void;
  userLoggedIn: boolean;
  setUserLoggedIn: (user: boolean) => void;
};

// Create the context
export const CustomFieldsContext = createContext<CustomFieldsContextType>({
  customFields: {},
  setCustomFields: () => {},
  handleAddFormId: () => {},
  handleEditFormId: () => {},
  handleDeleteFormId: () => {},
  stepName: "",
  setStepName: () => {},
  selecteFormIdTarget: () => {},
  selectedFormId: null,
  handleAddCustomField: () => {},
  handleEditCustomField: () => {},
  handleDeleteCustomField: () => {},
  deleteFormIDAllCustomFields: () => {},
  userLoggedIn: false,
  setUserLoggedIn: () => {},
});
