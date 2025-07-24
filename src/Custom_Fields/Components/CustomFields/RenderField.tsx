"use client";
// import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import dayjs, { Dayjs } from "dayjs";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { ChipInput } from "@/components/ui/chip-input";
import {
  SelectValue,
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import PasswordField from "@/components/ui/PasswordField";
import TimePicker from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface RenderFieldProps {
  getFieldProps: (fieldName: string) => {
    name: string;
    value: string;
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
    onBlur: (
      e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
    error?: string;
  };
  isEditMode?: boolean;
  label: string;
  setFieldValue: (
    field: string,
    value: string | string[] | boolean | FileData[] | Dayjs
  ) => void;
  type: string;
  values: {
    customFields: {
      [key: string]: string | number | boolean | FileData[] | Dayjs | string[];
    };
  };
  setFieldTouched: (field: string, value: boolean) => void;
  options: string[] | undefined;
  setFieldError: (field: string, error: string) => void;
  fieldHook?: {
    fieldProps: any;
    fieldMeta: any;
  };
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const RenderField = ({
  label,
  type,
  values,
  setFieldValue,
  setFieldTouched,
  options,
  setFieldError,
  fieldHook,
  isEditMode = false,
}: RenderFieldProps) => {
  // useEffect(() => {
  //   if (isEditMode) {
  //     setFieldTouched("customFields." + label, true);
  //   }
  // }, []);

  // console.log("🙇🙇🙇 ", values.customFields[label], fieldHook);

  const commonProps = {
    id: `customFields.${label}`,
    "data-field-name": label,
    autoFocus: fieldHook?.fieldMeta.error && fieldHook?.fieldMeta.touched,
    className:
      fieldHook?.fieldMeta.touched &&
      fieldHook?.fieldMeta.error &&
      "border-2 border-red-500",
  };

  switch (type) {
    case "text":
      return (
        <Input
          {...commonProps}
          name={"customFields." + label}
          value={values.customFields[label] as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFieldValue("customFields." + label, e.target.value);
          }}
          onBlur={() => setFieldTouched("customFields." + label, true)}
          placeholder={`Enter ${label.split(" |||||(")[0]}`}
        />
      );

    case "password":
      return (
        <div>
          <PasswordField
            {...commonProps}
            name={"customFields." + label}
            value={values.customFields[label] as string}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFieldValue("customFields." + label, e.target.value);
            }}
            onBlur={() => {
              setFieldTouched("customFields." + label, true);
            }}
          />
        </div>
      );

    case "number":
      return (
        <Input
          {...commonProps}
          type="number"
          name={"customFields." + label}
          value={values.customFields[label] as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFieldValue("customFields." + label, e.target.value);
          }}
          onBlur={() => setFieldTouched("customFields." + label, true)}
          placeholder={`Enter ${label.split(" |||||(")[0]} in numbers`}
        />
      );

    case "textarea":
      return (
        <Textarea
          {...commonProps}
          name={"customFields." + label}
          value={values.customFields[label] as string}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setFieldValue("customFields." + label, e.target.value);
          }}
          onBlur={() => setFieldTouched("customFields." + label, true)}
          placeholder={`Enter ${label.split(" |||||(")[0]}`}
        />
      );

    case "select":
      return (
        <Select
          value={values.customFields[label] as string}
          onValueChange={(value: string) =>
            setFieldValue("customFields." + label, value)
          }
        >
          <SelectTrigger {...commonProps}>
            <SelectValue placeholder={`Select ${label.split(" |||||(")[0]}`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
          {fieldHook?.fieldProps.required && (
            <Button
              style={{
                marginLeft: "-10px",
                color: "rgb(121, 121, 121)",
                display: "contents",
              }}
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                setFieldValue("customFields." + label, "");
              }}
            >
              Clear
            </Button>
          )}
        </Select>
      );

    case "checkbox":
      return (
        <div className="flex flex-row gap-4">
          {options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${label}-${option}`}
                className="capitalize"
                checked={(values.customFields[label] as string[])?.includes(
                  option
                )}
                onCheckedChange={(checked) => {
                  if (values.customFields[label] === undefined) {
                    setFieldValue("customFields." + label, [option]);
                    setFieldError("customFields." + label, "");
                  } else {
                    const currentValues = values.customFields[
                      label
                    ] as string[];
                    const newValues = checked
                      ? [...currentValues, option]
                      : currentValues.filter((value) => value !== option);

                    setFieldValue("customFields." + label, newValues);
                    if (newValues.length > 0) {
                      setFieldError("customFields." + label, "");
                    }
                  }
                  setFieldTouched("customFields." + label, true);
                }}
                onBlur={() => {
                  if (values.customFields[label] === undefined) {
                    setFieldError("customFields." + label, "");
                  }
                  setFieldTouched("customFields." + label, true);
                }}
              />
              <Label htmlFor={`${label}-${option}`} className="capitalize">
                {option}
              </Label>
            </div>
          ))}
        </div>
      );

    case "date":
      return (
        <DatePicker
          value={new Date(values.customFields[label] as string)}
          onChange={(e) =>
            setFieldValue(
              "customFields." + label,
              e && e instanceof Date ? e.toISOString() : ""
            )
          }
          onClose={() => setFieldTouched("customFields." + label, true)}
        />
      );

    case "time":
      return (
        <TimePicker
          {...commonProps}
          name={"customFields." + label}
          value={values.customFields[label] as string}
          onChange={(e) => {
            setFieldValue("customFields." + label, e);
          }}
          onBlur={() => setFieldTouched("customFields." + label, true)}
        />
      );

    case "datetime":
      return (
        <DateTimePicker
          value={
            values.customFields[label]
              ? dayjs(values.customFields[label] as string)
              : null
          }
          onChange={(e) =>
            setFieldValue(
              "customFields." + label,
              e && e instanceof Date ? e.toISOString() : ""
            )
          }
          onBlur={() => setFieldTouched("customFields." + label, true)}
        />
      );

    case "radio":
      return (
        <div className="flex items-center gap-4">
          <RadioGroup
            value={values.customFields[label] as string}
            onValueChange={(value) =>
              setFieldValue("customFields." + label, value)
            }
            className="flex flex-row gap-4"
          >
            {options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${label}-${option}`} />
                <Label htmlFor={`${label}-${option}`} className="capitalize">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button
            variant="link"
            onClick={(e) => {
              e.preventDefault();
              setFieldValue("customFields." + label, "");
            }}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        </div>
      );

    case "file":
      return (
        <div>
          <FileDropZone
            {...commonProps}
            value={values.customFields[label] as FileData[]}
            onFilesChange={async (files: File[] | FileData[]) => {
              try {
                const base64Files = await Promise.all(
                  files.map(async (file) => {
                    let fileurl;
                    if ((file as FileData).base64) {
                      fileurl = (file as FileData).base64;
                    } else {
                      if ((file as FileData).base64 === "") {
                        fileurl = "";
                      } else {
                        fileurl = await fileToBase64(file as File);
                      }
                    }
                    return {
                      base64: fileurl,
                      name: file.name,
                      type: file.type,
                      size: file.size,
                    };
                  })
                );
                const fileNames = base64Files.map((file) => file.name);
                const hasDuplicates =
                  new Set(fileNames).size !== fileNames.length;
                if (hasDuplicates) {
                  return;
                }
                setFieldValue("customFields." + label, base64Files);
              } catch {
                // Handle error
              }
            }}
            existingFiles={
              Array.isArray(values.customFields[label])
                ? (values.customFields[label] as FileData[]).map((file) => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    preview: file.base64,
                  }))
                : []
            }
          />
        </div>
      );

    case "multiSelect":
      return (
        <div className="space-y-2">
          <ChipInput
            {...commonProps}
            value={(values.customFields[label] as string[]) || []}
            onChange={(newOptions) => {
              setFieldValue(
                "customFields." + label,
                newOptions
                  .map((option) => option.trim())
                  .filter((option) => option.length > 0)
              );
            }}
            onBlur={() => setFieldTouched("customFields." + label, true)}
            placeholder={`Enter ${label.split(" |||||(")[0]}`}
            onSuggestionClick={(suggestion) => {
              const currentValues =
                (values.customFields[label] as string[]) || [];
              if (suggestion.trim() && !currentValues.includes(suggestion)) {
                setFieldValue("customFields." + label, [
                  ...currentValues,
                  suggestion,
                ]);
              }
            }}
            suggestions={
              options?.filter(
                (option) =>
                  !(values.customFields[label] as string[])?.includes(option)
              ) || []
            }
          />
        </div>
      );

    default:
      return null;
  }
};
