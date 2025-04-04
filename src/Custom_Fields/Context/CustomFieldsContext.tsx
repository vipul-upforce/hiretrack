import React, {
  useState,
  ReactNode,
  memo,
  useEffect,
  useCallback,
} from "react";
import {
  CustomField,
  CustomFields,
  SelectedFormObject,
} from "../Types/CustomField";
import { CustomFieldsContext } from ".";
import {
  useLazyGetCustomFieldsQuery,
  useUpdateCustomFieldsMutation,
} from "@/lib/features/org/orgApi";
import Cookies from "js-cookie";

// Create a provider component
export const CustomFieldsProvider: React.FC<{ children: ReactNode }> = memo(
  ({ children }) => {
    const [customFields, setCustomFields] = useState<CustomFields>({});
    const [stepName, setStepName] = useState<string>("FormList");
    const [selectedFormId, setSelectedFormId] =
      useState<SelectedFormObject | null>(null);
    const [updateCustomFields] = useUpdateCustomFieldsMutation();
    const [getCustomField] = useLazyGetCustomFieldsQuery();
    const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);

    const postCustomFields = useCallback(() => {
      const user = Cookies.get("user");
      if (user) {
        const userObject = JSON.parse(user);
        const orgId = userObject.organizationId;
        updateCustomFields({
          orgId: orgId,
          customFields: customFields,
        });
      }
    }, [customFields]);

    const getCustomFields = useCallback(async () => {
      const user = Cookies.get("user");
      if (user) {
        const userObject = JSON.parse(user);
        const orgId = userObject.organizationId;
        const data = await getCustomField(orgId);
        if (data.data) setCustomFields(data.data);
      }
    }, []);

    const getAndSetCustomFields = useCallback(async () => {
      if (Object.keys(customFields).length === 0) {
        await getCustomFields();
      } else {
        postCustomFields();
      }
    }, [customFields, userLoggedIn]);

    useEffect(() => {
      if (userLoggedIn) {
        getAndSetCustomFields();
      } else if (!userLoggedIn && Object.keys(customFields).length > 0) {
        setCustomFields({});
      }
    }, [customFields, userLoggedIn]);

    const handleAddFormId = useCallback((formName: string) => {
      const randomId = Math.random().toString(36).substr(2, 9);
      setCustomFields((prev) => ({
        ...prev,
        [randomId]: { fields: [], formName },
      }));
    }, []);

    const handleEditFormId = useCallback(
      (formName: string, formId: string | null) => {
        setCustomFields((prev) => {
          const newFields = { ...prev };
          if (formId) {
            newFields[formId] = { fields: prev[formId].fields, formName };
          }
          return newFields;
        });
      },
      []
    );

    const handleDeleteFormId = useCallback((formId: string) => {
      setCustomFields((prev) => {
        const newFields = { ...prev };
        delete newFields[formId];
        return newFields;
      });
    }, []);

    const selecteFormIdTarget = useCallback(
      (formId: string) => {
        const formIdObject = customFields[formId];
        if (formIdObject) {
          const form = {
            ...formIdObject,
            formId: formId,
          };
          setSelectedFormId(form);
        }
      },
      [customFields]
    );

    const handleAddCustomField = useCallback(
      (customField: CustomField, formId: string | null) => {
        const formIdObject = formId && customFields[formId];
        if (formIdObject) {
          setCustomFields((prev) => ({
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: [...formIdObject.fields, customField],
            },
          }));
          setSelectedFormId((prev) => ({
            ...prev,
            fields: [...(prev?.fields || []), customField],
            formId: formId,
            formName: formIdObject.formName,
          }));
        }
      },
      [customFields]
    );

    const handleEditCustomField = useCallback(
      (customField: CustomField, formId: string | null) => {
        const formIdObject = formId && customFields[formId];
        if (formIdObject) {
          setCustomFields((prev) => ({
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: formIdObject.fields.map((field) =>
                field.id === customField.id ? customField : field
              ),
            },
          }));
          setSelectedFormId((prev) => ({
            ...prev,
            fields: formIdObject.fields.map((field) =>
              field.id === customField.id ? customField : field
            ),
            formId: formId,
            formName: formIdObject.formName,
          }));
        }
      },
      [customFields]
    );

    const handleDeleteCustomField = useCallback(
      (customFieldID: string, formId: string | null) => {
        if (!formId) return;
        const formIdObject = customFields[formId];
        if (formIdObject) {
          const newFields = formIdObject.fields.filter(
            (field) => field.id !== customFieldID
          );
          setCustomFields((prev) => ({
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: newFields,
            },
          }));
          setSelectedFormId((prev) => ({
            ...prev,
            fields: newFields,
            formId: formId,
            formName: formIdObject.formName,
          }));
        }
      },
      [customFields]
    );

    const deleteFormIDAllCustomFields = useCallback(
      (formId: string) => {
        const formIdObject = customFields[formId];
        if (formIdObject) {
          setCustomFields((prev) => ({
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: [],
            },
          }));

          // Update selected form ID state if it matches the cleared form
          if (selectedFormId?.formId === formId) {
            setSelectedFormId(
              (prev) =>
                prev && {
                  ...prev,
                  fields: [],
                  formId: prev.formId,
                  formName: prev.formName,
                }
            );
          }
        }
      },
      [customFields, selectedFormId]
    );

    return (
      <CustomFieldsContext.Provider
        value={{
          customFields,
          setCustomFields,
          handleAddFormId,
          handleEditFormId,
          handleDeleteFormId,
          stepName,
          setStepName,
          selecteFormIdTarget,
          selectedFormId,
          handleAddCustomField,
          handleEditCustomField,
          handleDeleteCustomField,
          deleteFormIDAllCustomFields,
          userLoggedIn,
          setUserLoggedIn,
        }}
      >
        {children}
      </CustomFieldsContext.Provider>
    );
  }
);

CustomFieldsProvider.displayName = "CustomFieldsProvider";
