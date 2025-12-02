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
  useLazyGetCustomFieldsByOrgNameQuery,
  User,
} from "@/lib/features/org/orgApi";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";

const getOrgParamFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get("o");
};

// Create a provider component
export const CustomFieldsProvider: React.FC<{ children: ReactNode }> = memo(
  ({ children }) => {
    const [customFields, setCustomFields] = useState<CustomFields>({});
    const [stepName, setStepName] = useState<string>("FormList");
    const [selectedFormId, setSelectedFormId] =
      useState<SelectedFormObject | null>(null);
    const [updateCustomFields] = useUpdateCustomFieldsMutation();
    const [getCustomField] = useLazyGetCustomFieldsQuery();
    const [getCustomFieldsByOrgName] = useLazyGetCustomFieldsByOrgNameQuery();
    const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);
    const pathname = usePathname();
    const { user }: { user: User } = useSelector(
      (state: any) => state.auth || {}
    );
    // const searchParams = useSearchParams();

    const postCustomFields = useCallback(async () => {
      // debugger;
      // const token = Cookies.get("token");
      if (
        (user && user.id && pathname?.includes("jobs-board")) ||
        pathname?.includes("jobs") ||
        pathname?.includes("settings") ||
        pathname?.endsWith("dashboard")
      ) {
        const orgId = user?.organizationId;
        updateCustomFields({
          orgId: orgId,
          customFields: customFields,
        });
      }
    }, [customFields, updateCustomFields, pathname]);

    const getCustomFields = useCallback(async () => {
      // const token = Cookies.get("token");
      if (user && user.role !== "" && user.role !== "candidate") {
        const userObject = user;
        const orgId = userObject.organizationId;
        const data = await getCustomField(orgId);
        if (data.data) setCustomFields(data.data);
        // }
      } else if (pathname?.includes("/apply-jobs")) {
        // debugger;
        const orgParam = getOrgParamFromUrl();
        // if (orgParam) {
        try {
          const data = await getCustomFieldsByOrgName(orgParam);
          if (data.data) setCustomFields(data.data);
        } catch (error) {
          console.error("Error fetching custom fields by org name:", error);
        }
        // }
      }
    }, [getCustomField, getCustomFieldsByOrgName, pathname]);

    const getAndSetCustomFields = useCallback(async () => {
      if (Object.keys(customFields).length === 0) {
        await getCustomFields();
      } else {
        postCustomFields();
      }
    }, [customFields, userLoggedIn, getCustomFields, postCustomFields]);

    useEffect(() => {
      // debugger;
      const isApplyJobsPage = pathname?.includes("/apply-jobs");
      // const isJobsPage = pathname?.includes("/dashboard/jobs-board");

      if (userLoggedIn || isApplyJobsPage) {
        getAndSetCustomFields();
      } else if (
        !userLoggedIn &&
        !isApplyJobsPage &&
        Object.keys(customFields).length > 0
      ) {
        setCustomFields({});
      }
    }, [pathname, userLoggedIn, getAndSetCustomFields]);

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
        // debugger;
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
          const individualCustomFields = formIdObject.fields.filter(
            (field) => field.candidateId || field.jobId
          );
          setCustomFields((prev) => ({
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: [...individualCustomFields],
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

    const deleteFormIDAllIndCustomFields = useCallback(
      (formId: string) => {
        const formIdObject = customFields[formId];
        if (formIdObject) {
          const globalCustomFields = formIdObject.fields.filter(
            (field) => !field.candidateId && !field.jobId
          );
          setCustomFields((prev) => ({
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: [...globalCustomFields],
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
          setSelectedFormId,
          deleteFormIDAllIndCustomFields,
          // postCustomFields,
        }}
      >
        {children}
      </CustomFieldsContext.Provider>
    );
  }
);

CustomFieldsProvider.displayName = "CustomFieldsProvider";
