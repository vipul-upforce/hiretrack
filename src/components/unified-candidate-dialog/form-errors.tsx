import React from 'react';
import { useField } from 'formik';

interface FormErrorProps {
  name: string;
}

export function FormError({ name }: FormErrorProps) {
  const [_, meta] = useField(name);

  // Only show error if the field was touched OR if the form was submitted
  if (meta.touched && meta.error) {
    return (
      <p className="mt-1 text-xs font-medium text-red-500 animate-in fade-in slide-in-from-top-1">
        {meta.error}
      </p>
    );
  }

  return null;
}
