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
          onChange={(value) => onResponseChange(field.id, value)}
          error={errors[field.id]}
          touched={touched[field.id]}
        />
      ))}
    </div>
  );
}
