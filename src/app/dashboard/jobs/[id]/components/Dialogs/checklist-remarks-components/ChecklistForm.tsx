import React from 'react';
import { ChecklistFormProps } from '@/types/checklist';
import { ChecklistFieldRenderer } from './ChecklistFieldRenderer';

export function ChecklistForm({
  checklist,
  responses,
  onResponseChange,
  errors = {},
  touched = {},
}: ChecklistFormProps) {
  return (
    <div className="space-y-4">
      {checklist.fields.map((field) => (
        <ChecklistFieldRenderer
          key={field.id}
          field={field}
          value={responses[field.id]?.value ?? null}
          response={responses[field.id]}
          onChange={(value, files) => onResponseChange(field.id, value, files)}
          error={errors[field.id]}
          touched={touched[field.id]}
        />
      ))}
    </div>
  );
}
