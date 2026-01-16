'use client';

import { useFormikContext } from 'formik';
import { useEffect, RefObject } from 'react';

interface ScrollToFormErrorProps {
  containerRef: RefObject<HTMLDivElement | null>;
  offset?: number;
}

export function ScrollToFormError({
  containerRef,
  offset = 20,
}: ScrollToFormErrorProps) {
  const { isValid, isSubmitting, submitCount, errors } = useFormikContext();

  useEffect(() => {
    if (submitCount > 0 && !isValid && !isSubmitting && containerRef.current) {
      const firstErrorKey = Object.keys(errors)[0];

      if (firstErrorKey) {
        // Find the element by ID or Name
        const element =
          document.getElementById(firstErrorKey) ||
          document.querySelector(`[name="${firstErrorKey}"]`);

        if (element) {
          const container = containerRef.current;

          // Get position of element and container relative to the viewport
          const elementRect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          // Calculate the relative position inside the container
          const relativeTop = elementRect.top - containerRect.top;

          // Scroll the container to that position (current scroll + difference - offset)
          container.scrollTo({
            top: container.scrollTop + relativeTop - offset,
            behavior: 'smooth',
          });
        }
      }
    }
  }, [submitCount, isValid, isSubmitting, errors, containerRef, offset]);

  return null;
}
