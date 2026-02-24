import { useState, useEffect, RefObject } from 'react';
import { FormikProps, FormikValues } from 'formik';

interface UseUnsavedChangesProtectionProps<T extends FormikValues> {
  formikRef: RefObject<FormikProps<T> | null>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCloseCallback?: () => void;
}

/**
 * Deep comparison helper to check if values have actually changed
 */
const hasActualChanges = (
  current: unknown,
  initial: unknown,
): boolean => {
  // If both are null/undefined, no changes
  if (!current && !initial) return false;
  if (!current || !initial) {
    // One is null/undefined, the other isn't - check if it's meaningful
    // Empty string, empty array, or empty object should be considered same as null
    if (current === '' || initial === '') return false;
    if (Array.isArray(current) && current.length === 0) return false;
    if (Array.isArray(initial) && initial.length === 0) return false;
    if (
      typeof current === 'object' &&
      current !== null &&
      Object.keys(current).length === 0
    ) {
      return false;
    }
    if (
      typeof initial === 'object' &&
      initial !== null &&
      Object.keys(initial).length === 0
    ) {
      return false;
    }
    return true;
  }

  // Handle arrays
  if (Array.isArray(current) && Array.isArray(initial)) {
    if (current.length !== initial.length) return true;
    // For arrays, do a shallow comparison
    for (let i = 0; i < current.length; i += 1) {
      if (hasActualChanges(current[i], initial[i])) return true;
    }
    return false;
  }

  // Handle File objects - compare by name and size
  if (current instanceof File && initial instanceof File) {
    return (
      current.name !== initial.name || current.size !== initial.size
    );
  }

  // Handle File vs null/undefined
  if (
    (current instanceof File && !initial) ||
    (!current && initial instanceof File)
  ) {
    return true;
  }

  // Handle objects (like customFields)
  if (
    typeof current === 'object' &&
    current !== null &&
    typeof initial === 'object' &&
    initial !== null &&
    !Array.isArray(current) &&
    !Array.isArray(initial) &&
    !(current instanceof File) &&
    !(initial instanceof File)
  ) {
    const currentObj = current as Record<string, unknown>;
    const initialObj = initial as Record<string, unknown>;
    const allKeys = new Set([
      ...Object.keys(currentObj),
      ...Object.keys(initialObj),
    ]);

    for (const key of allKeys) {
      if (hasActualChanges(currentObj[key], initialObj[key])) return true;
    }
    return false;
  }

  // Handle primitive values
  if (current !== initial) {
    // Special case: empty string vs null/undefined should be considered the same
    if (
      (current === '' && (initial === null || initial === undefined)) ||
      ((current === null || current === undefined) && initial === '')
    ) {
      return false;
    }
    // Special case: 0 vs empty string or null
    if (
      (current === 0 && (initial === '' || initial === null || initial === undefined)) ||
      ((current === '' || current === null || current === undefined) && initial === 0)
    ) {
      return false;
    }
    return true;
  }

  return false;
};

/**
 * Checks if form has actual unsaved changes by comparing current values with initial values
 */
const hasUnsavedChanges = <T extends FormikValues>(
  formik: FormikProps<T> | null,
): boolean => {
  if (!formik) return false;

  // Must be dirty AND have actual value changes
  if (!formik.dirty) return false;

  return hasActualChanges(formik.values, formik.initialValues);
};

export const useUnsavedChangesProtection = <T extends FormikValues>({
  formikRef,
  isOpen,
  setIsOpen,
  onCloseCallback,
}: UseUnsavedChangesProtectionProps<T>) => {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] =
    useState(false);

  // Reset unsaved changes dialog state when main dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowUnsavedChangesDialog(false);
    }
  }, [isOpen]);

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      const formik = formikRef.current;
      if (hasUnsavedChanges(formik)) {
        // Form has actual unsaved changes, show confirmation
        setShowUnsavedChangesDialog(true);
        // Don't call setIsOpen(false) - keep dialog open
        return;
      }
    }
    // No unsaved changes or opening dialog - proceed normally
    setIsOpen(open);
  };

  const handleCancelClick = () => {
    const formik = formikRef.current;
    if (hasUnsavedChanges(formik)) {
      // Form has actual unsaved changes, show confirmation
      setShowUnsavedChangesDialog(true);
    } else {
      // No unsaved changes, close directly
      if (onCloseCallback) {
        onCloseCallback();
      }
      setIsOpen(false);
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedChangesDialog(false);
    if (onCloseCallback) {
      onCloseCallback();
    }
    setIsOpen(false);
    // Reset form when closing with unsaved changes
    if (formikRef.current) {
      formikRef.current.resetForm();
    }
  };

  const handleCancelClose = () => {
    setShowUnsavedChangesDialog(false);
    // Dialog is already open (we prevented it from closing), no need to set it
  };

  return {
    showUnsavedChangesDialog,
    handleDialogClose,
    handleCancelClick,
    handleConfirmClose,
    handleCancelClose,
  };
};
