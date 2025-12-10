import { FormikErrors } from 'formik';

/**
 * Scrolls to and focuses the first error field in a form.
 * Handles both top-level fields and nested customFields errors.
 *
 * @param errors - Formik errors object
 * @param options - Optional configuration
 * @param options.scrollBlock - Scroll position: "nearest" | "center" | "start" | "end"
 * @param options.preventScrollOnFocus - Whether to prevent scroll when focusing (default: true)
 */
export const scrollToError = (
  errors: FormikErrors<any>,
  options?: {
    scrollBlock?: 'nearest' | 'center' | 'start' | 'end';
    preventScrollOnFocus?: boolean;
  },
): void => {
  if (!errors || Object.keys(errors).length === 0) {
    return;
  }

  const firstErrorKey = Object.keys(errors)[0];
  if (!firstErrorKey) {
    return;
  }

  const scrollBlock = options?.scrollBlock ?? 'nearest';
  const preventScrollOnFocus = options?.preventScrollOnFocus ?? true;

  let element: HTMLElement | null = null;

  // Handle nested customFields errors
  if (firstErrorKey === 'customFields' && errors.customFields) {
    const customFieldErrors = errors.customFields as Record<string, any>;
    const cfKey = Object.keys(customFieldErrors)[0];
    if (cfKey) {
      // Try multiple selector strategies for custom fields
      element =
        (document.querySelector(
          `[id="customFields.${cfKey}"]`,
        ) as HTMLElement) ||
        (document.querySelector(
          `[id="${firstErrorKey}.${cfKey}"]`,
        ) as HTMLElement) ||
        (document.querySelector(`[data-field-name="${cfKey}"]`) as HTMLElement);
    }
  } else {
    // Handle top-level fields
    // Try id selector first (for fields like "skills")
    element = document.querySelector(`[id="${firstErrorKey}"]`) as HTMLElement;

    // Fallback to name attribute if id not found
    if (!element) {
      element = document.querySelector(
        `[name="${firstErrorKey}"]`,
      ) as HTMLElement;
    }
  }

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: scrollBlock });
    element.focus({ preventScroll: preventScrollOnFocus });
  }
};
