import React from "react";
import { IChecklistField } from "@/lib/models/JobLaneConfig";
import { ChecklistFieldRenderer } from "./ChecklistFieldRenderer";

interface ChecklistFormProps {
  checklist: {
    id: string;
    name: string;
    description?: string;
    fields: IChecklistField[];
    isMandatory: boolean;
  };
  responses: Record<string, any>;
  onResponseChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
}

export const ChecklistForm: React.FC<ChecklistFormProps> = ({
  checklist,
  responses,
  onResponseChange,
  errors,
  touched = {},
}) => {
  return (
    <div className="space-y-4">
      {checklist.fields.map((field) => (
        <ChecklistFieldRenderer
          key={field.id}
          field={field}
          value={responses[field.id]?.value}
          onChange={(value) => onResponseChange(field.id, value)}
          error={errors[field.id]}
          touched={touched[field.id]}
        />
      ))}
    </div>
  );
};

