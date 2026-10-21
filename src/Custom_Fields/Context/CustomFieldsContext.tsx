/* eslint-disable max-lines */
import React, {
  useState,
  ReactNode,
  memo,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
  useLazyGetCustomFieldsQuery,
  useUpdateCustomFieldsMutation,
  useLazyGetCustomFieldsByOrgNameQuery,
} from '@/lib/features/org/orgApi';
import { usePathname } from 'next/navigation';
import logger from '@/lib/logger';
import { sseManager } from '@/hooks/useNotificationSSE';
import { CustomFieldsContext } from '.';
import {
  CustomField,
  CustomFields,
  SelectedFormObject,
} from '../Types/CustomField';

const getOrgParamFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return urlParams.get('o');
};

// Create a provider component
export const CustomFieldsProvider: React.FC<{ children: ReactNode }> = memo(
  ({ children }: { children: ReactNode }) => {
    const [customFields, setCustomFields] = useState<CustomFields>({});
    const [stepName, setStepName] = useState<string>('FormList');
    const [selectedFormId, setSelectedFormId] =
      useState<SelectedFormObject | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [hasAttemptedLoad, setHasAttemptedLoad] = useState<boolean>(false);
    const [updateCustomFields] = useUpdateCustomFieldsMutation();
    const [getCustomField] = useLazyGetCustomFieldsQuery();
    const [getCustomFieldsByOrgName] = useLazyGetCustomFieldsByOrgNameQuery();
    const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);
    const pathname = usePathname();
    const { user } = useAppSelector((state) => state.auth || {});
    const dispatch = useAppDispatch();
    const isUpdatingFromSSERef = React.useRef<boolean>(false);
    const loadedForOrgIdRef = React.useRef<string | null>(null);
    const subscriberIdRef = React.useRef<string>(
      `custom-fields-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    );

    const resetCustomFieldsState = useCallback(() => {
      setCustomFields({});
      setHasAttemptedLoad(false);
      setSelectedFormId(null);
      loadedForOrgIdRef.current = null;
    }, []);

    const postCustomFields = useCallback(async () => {
      if (
        (user && user.id && pathname?.includes('jobs-board')) ||
        pathname?.includes('jobs') ||
        pathname?.includes('settings') ||
        pathname?.endsWith('dashboard')
      ) {
        const orgId = user?.organizationId;
        if (!orgId || loadedForOrgIdRef.current !== orgId) {
          return;
        }
        try {
          await updateCustomFields({
            orgId,
            customFields,
          }).unwrap();
        } catch (err) {
          logger.error('Error saving custom fields:', err);
        }
      }
    }, [customFields, updateCustomFields, pathname, user]);

    const loadCustomFields = useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (user && user.role !== '' && user.role !== 'candidate') {
          const orgId = user.organizationId;
          if (orgId) {
            const data = await getCustomField(orgId);
            if (data.data) {
              setCustomFields(data.data);
              loadedForOrgIdRef.current = orgId;
            }
          }
        } else if (pathname?.includes('/apply-jobs')) {
          const orgParam = getOrgParamFromUrl();
          if (orgParam) {
            const data = await getCustomFieldsByOrgName(orgParam);
            if (data.data) {
              setCustomFields(data.data);
            }
          }
        }
        setHasAttemptedLoad(true);
      } catch (err) {
        const fetchError =
          err instanceof Error
            ? err
            : new Error('Failed to load custom fields');
        setError(fetchError);
        logger.error('Error fetching custom fields:', err);
      } finally {
        setIsLoading(false);
      }
    }, [getCustomField, getCustomFieldsByOrgName, pathname, user]);

    // Clear stale in-memory fields on logout (skip guest apply-jobs flow)
    useEffect(() => {
      const isApplyJobsPage = pathname?.includes('/apply-jobs');
      if (!user?.id && !isApplyJobsPage) {
        setUserLoggedIn(false);
        resetCustomFieldsState();
      }
    }, [user?.id, pathname, resetCustomFieldsState]);

    // Reload when the active organization changes within the same session
    useEffect(() => {
      const orgId = user?.organizationId;
      if (!orgId || !user?.id) {
        return;
      }

      if (
        loadedForOrgIdRef.current !== null &&
        loadedForOrgIdRef.current !== orgId
      ) {
        resetCustomFieldsState();
      }
    }, [user?.organizationId, user?.id, resetCustomFieldsState]);

    // Separate effect for loading custom fields
    useEffect(() => {
      const isApplyJobsPage = pathname?.includes('/apply-jobs');

      if (
        (userLoggedIn || isApplyJobsPage) &&
        !hasAttemptedLoad &&
        !isLoading
      ) {
        loadCustomFields();
      }
    }, [
      pathname,
      userLoggedIn,
      hasAttemptedLoad,
      isLoading,
      loadCustomFields,
      user?.organizationId,
    ]);

    // Subscribe to SSE custom fields updates - for all logged-in non-candidate users
    useEffect(() => {
      const isAuthPage =
        pathname?.includes('/auth/login') || pathname?.includes('/auth/');

      // Subscribe for all logged-in users who are not candidates
      // This ensures interviewers and other roles receive real-time updates
      const shouldSubscribe =
        !isAuthPage &&
        user &&
        user.id &&
        user.role !== '' &&
        user.role !== 'candidate';

      if (!shouldSubscribe) {
        return () => {
          // No cleanup needed
        };
      }

      // Set dispatch for token refresh (commented out - refresh logic removed from SSE/WS)
      // sseManager.setDispatch(dispatch);

      // Subscribe to custom fields updates
      const unsubscribe = sseManager.subscribe({
        id: subscriberIdRef.current,
        onCustomFieldsUpdate: (updatedCustomFields: CustomFields) => {
          // Check if it's an error object before setting state
          // verifyAndDecryptSSE returns { success: false, error: "..." } on failure
          if (
            updatedCustomFields &&
            typeof updatedCustomFields === 'object' &&
            ('success' in updatedCustomFields || 'error' in updatedCustomFields)
          ) {
            const errorData = updatedCustomFields as { success?: boolean; error?: string };
            if (errorData.success === false || errorData.error) {
              logger.error(
                'Error object received as customFields from SSE, not updating state:',
                errorData.error || 'Unknown error',
              );
              return;
            }
          }
          
          // Always update the state with SSE data to ensure real-time reactivity
          // React will handle whether a re-render is actually needed
          isUpdatingFromSSERef.current = true;
          setCustomFields(updatedCustomFields);
          // Reset flag after React has processed the update
          setTimeout(() => {
            isUpdatingFromSSERef.current = false;
          }, 100);
        },
      });

      return () => {
        unsubscribe();
      };
    }, [pathname, user, dispatch]);

    // Separate effect for saving custom fields when they change
    useEffect(() => {
      const orgId = user?.organizationId;
      if (
        hasAttemptedLoad &&
        !isLoading &&
        Object.keys(customFields).length > 0 &&
        !isUpdatingFromSSERef.current &&
        orgId &&
        loadedForOrgIdRef.current === orgId
      ) {
        postCustomFields();
      }
    }, [
      customFields,
      hasAttemptedLoad,
      isLoading,
      postCustomFields,
      user?.organizationId,
    ]);

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
          if (formId && prev[formId]) {
            newFields[formId] = { fields: prev[formId].fields, formName };
          }
          return newFields;
        });
      },
      [],
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
            formId,
          };
          setSelectedFormId(form);
        }
      },
      [customFields],
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
            formId,
            formName: formIdObject.formName,
          }));
        }
      },
      [customFields],
    );

    const handleEditCustomField = useCallback(
      (customField: CustomField, formId: string | null) => {
        if (!formId) return;

        setCustomFields((prev) => {
          const formIdObject = prev[formId];
          if (formIdObject) {
            const updatedFields = formIdObject.fields.map((field) =>
              field.id === customField.id ? customField : field,
            );
            const updatedForm = {
              ...formIdObject,
              fields: updatedFields,
            };

            // Update selectedFormId if it matches
            setSelectedFormId((currentSelected) => {
              if (currentSelected?.formId === formId) {
                return {
                  ...currentSelected,
                  fields: updatedFields,
                  formId,
                  formName: updatedForm.formName,
                };
              }
              return currentSelected;
            });

            return {
              ...prev,
              [formId]: updatedForm,
            };
          }
          return prev;
        });
      },
      [],
    );

    const handleDeleteCustomField = useCallback(
      (customFieldID: string, formId: string | null) => {
        if (!formId) return;

        setCustomFields((prev) => {
          const formIdObject = prev[formId];
          if (formIdObject) {
            const newFields = formIdObject.fields.filter(
              (field) => field.id !== customFieldID,
            );
            const updatedForm = {
              ...formIdObject,
              fields: newFields,
            };

            // Update selectedFormId if it matches
            setSelectedFormId((currentSelected) => {
              if (currentSelected?.formId === formId) {
                return {
                  ...currentSelected,
                  fields: newFields,
                  formId,
                  formName: updatedForm.formName,
                };
              }
              return currentSelected;
            });

            return {
              ...prev,
              [formId]: updatedForm,
            };
          }
          return prev;
        });
      },
      [],
    );

    const deleteFormIDAllCustomFields = useCallback((formId: string) => {
      setCustomFields((prev) => {
        const formIdObject = prev[formId];
        if (formIdObject) {
          const individualCustomFields = formIdObject.fields.filter(
            (field) => field.candidateId || field.jobId,
          );
          return {
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: [...individualCustomFields],
            },
          };
        }
        return prev;
      });

      setSelectedFormId((prev) => {
        if (prev?.formId === formId) {
          return {
            ...prev,
            fields: [],
            formId: prev.formId,
            formName: prev.formName,
          };
        }
        return prev;
      });
    }, []);

    const deleteFormIDAllIndCustomFields = useCallback((formId: string) => {
      setCustomFields((prev) => {
        const formIdObject = prev[formId];
        if (formIdObject) {
          const globalCustomFields = formIdObject.fields.filter(
            (field) => !field.candidateId && !field.jobId,
          );
          return {
            ...prev,
            [formId]: {
              ...formIdObject,
              fields: [...globalCustomFields],
            },
          };
        }
        return prev;
      });

      setSelectedFormId((prev) => {
        if (prev?.formId === formId) {
          return {
            ...prev,
            fields: [],
            formId: prev.formId,
            formName: prev.formName,
          };
        }
        return prev;
      });
    }, []);

    const isReady = !isLoading && hasAttemptedLoad;

    return (
      <CustomFieldsContext.Provider
        value={useMemo(
          () => ({
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
            isLoading,
            error,
            isReady,
          }),
          [
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
            isLoading,
            error,
            isReady,
          ],
        )}
      >
        {children}
      </CustomFieldsContext.Provider>
    );
  },
);

CustomFieldsProvider.displayName = 'CustomFieldsProvider';
