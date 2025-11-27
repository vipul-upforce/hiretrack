import React from "react";
import { IChecklistField } from "@/lib/models/JobLaneConfig";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea as UITextarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "@/components/ui/chip-input";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { DatePicker } from "@/components/ui/date-picker";
import TimePicker from "@/components/ui/time-picker";
import dayjs from "dayjs";
import { toast } from "@/hooks/use-toast";

interface ChecklistFieldRendererProps {
  field: IChecklistField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  touched?: boolean;
}

export const ChecklistFieldRenderer: React.FC<ChecklistFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  touched,
}) => {
  const fieldId = `checklist-field-${field.id}`;

  const renderField = () => {
    const showError = touched && error;
    const errorClass = showError ? "border-red-500 focus:border-red-500" : "";
    switch (field.type) {
      case "text":
      case "email":
        return (
          <Input
            id={fieldId}
            type={field.type}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        );

      case "number":
        return (
          <Input
            id={fieldId}
            type="number"
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className={errorClass}
          />
        );

      case "textarea":
        return (
          <UITextarea
            id={fieldId}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        );

      case "checkbox":
        if (field.options && field.options.length > 0) {
          // Multiple checkboxes
          const selectedValues = Array.isArray(value) ? value : [];
          return (
            <div className="space-y-2">
              {field.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldId}-${idx}`}
                    checked={selectedValues.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selectedValues, option]);
                      } else {
                        onChange(selectedValues.filter((v: any) => v !== option));
                      }
                    }}
                  />
                  <Label htmlFor={`${fieldId}-${idx}`}>{option}</Label>
                </div>
              ))}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={fieldId}
                checked={Boolean(value)}
                onCheckedChange={onChange}
              />
              <Label htmlFor={fieldId}>{field.label}</Label>
            </div>
          );
        }

      case "radio":
        return (
          <RadioGroup value={value || ""} onValueChange={onChange}>
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldId}-${idx}`} />
                <Label htmlFor={`${fieldId}-${idx}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "select":
        return (
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue
                placeholder={field.placeholder || "Select an option"}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiSelect":
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <ChipInput
            value={selectedValues}
            onChange={(value) => {
              onChange(value);
            }}
            placeholder={field.placeholder || "Select options"}
            suggestions={field.options || []}
            onSuggestionClick={(suggestion) => {
              const updatedValues = [
                ...(selectedValues || []),
                suggestion,
              ].filter(
                (v, index, self) => v && self.indexOf(v) === index // Remove duplicates
              );
              onChange(updatedValues);
            }}
          />
        );

      case "date":
        return (
          <DatePicker
            value={value ? new Date(value) : undefined}
            onChange={(date) => {
              // DatePicker may return different object types, handle multiple cases
              let isoString = "";
              if (date) {
                if (date instanceof Date) {
                  isoString = date.toISOString();
                } else if (typeof (date as any).toISOString === "function") {
                  // Handle other date-like objects with toISOString method
                  isoString = (date as any).toISOString();
                } else if (typeof date === "string") {
                  // Handle string dates
                  try {
                    isoString = new Date(date).toISOString();
                  } catch {
                    isoString = "";
                  }
                } else if (date && typeof date === "object") {
                  // Handle other date-like objects
                  try {
                    isoString = new Date(date as any).toISOString();
                  } catch {
                    isoString = "";
                  }
                }
              }
              onChange(isoString || "");
            }}
            showTimePicker={false}
            format="MM/DD/YYYY"
            placeholder="Select date"
            showNowButton={false}
          />
        );

      case "time":
        return (
          <TimePicker
            name={fieldId}
            value={value || ""}
            onChange={(time) => onChange(time)}
            onBlur={() => {}}
          />
        );

      case "datetime":
        return (
          <DateTimePicker
            value={value ? dayjs(value) : null}
            onChange={(date) => {
              // DateTimePicker may return Dayjs or Date object, handle both
              let isoString = "";
              if (date) {
                if (date instanceof Date) {
                  isoString = date.toISOString();
                } else if (typeof (date as any).toISOString === "function") {
                  // Dayjs object has toISOString method
                  isoString = (date as any).toISOString();
                }
              }
              onChange(isoString);
            }}
          />
        );

      case "password":
        return (
          <Input
            id={fieldId}
            type="password"
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        );

      case "file":
        const fileValue = Array.isArray(value) ? value : [];
        return (
          <FileDropZone
            value={fileValue}
            onFilesChange={async (files: File[]) => {
              try {
                const fileData = await Promise.all(
                  files.map(async (file) => {
                    // Check file size (50MB limit)
                    if (file.size > 50 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: `${file.name} exceeds 50MB limit`,
                        variant: "destructive",
                      });
                      return null;
                    }

                    const base64 = await new Promise<string>(
                      (resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                      }
                    );

                    return {
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      base64: base64,
                    };
                  })
                );

                const validFiles = fileData.filter(Boolean);
                onChange(validFiles);
              } catch (error) {
                toast({
                  title: "Upload failed",
                  description: "Failed to process files",
                  variant: "destructive",
                });
              }
            }}
            existingFiles={fileValue.map((file: any) => ({
              name: file.name,
              type: file.type,
              size: file.size,
              url: file.base64,
              preview: file.base64,
            }))}
            maxSize={50 * 1024 * 1024} // 50MB
          />
        );

      default:
        return (
          <Input
            id={fieldId}
            placeholder={field.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderField()}
      {touched && error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

