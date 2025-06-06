"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { Checkbox, FormGroup } from "@mui/material";
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
import DatePicker from "@/components/ui/datepicker";
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
}: RenderFieldProps) => {
  // Common props for focus handling
  const commonProps = {
    id: `customFields.${label}`,
    "data-field-name": label,
    autoFocus: fieldHook?.fieldMeta.error && fieldHook?.fieldMeta.touched,
    className: fieldHook?.fieldMeta.touched && fieldHook?.fieldMeta.error && 'border-2 border-red-500'
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
          placeholder={`Enter ${label}`}
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
          placeholder={`Enter ${label} in numbers`}
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
          placeholder={`Enter ${label}`}
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
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
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
        </Select>
      );

    case "checkbox":
      return (
        <FormControl component="fieldset">
          <FormGroup
            style={{ display: "flex", flexDirection: "row", gap: "10px" }}
          >
            {options?.map((option) => (
              <FormControlLabel
                key={option}
                control={
                  <Checkbox
                    {...commonProps}
                    checked={(values.customFields[label] as string[])?.includes(
                      option
                    )}
                    className="capitalize"
                    onBlur={() => {
                      if (values.customFields[label] === undefined) {
                        setFieldError("customFields." + label, "");
                      }
                      setFieldTouched("customFields." + label, true);
                    }}
                    onChange={(e) => {
                      if (values.customFields[label] === undefined) {
                        setFieldValue("customFields." + label, [option]);
                        setFieldError("customFields." + label, "");
                      } else {
                        const currentValues = values.customFields[
                          label
                        ] as string[];
                        const newValues = currentValues.includes(option)
                          ? currentValues.filter((value) => value !== option)
                          : [...currentValues, option];

                        setFieldValue("customFields." + label, newValues);
                        if (newValues.length > 0 || !e.target.checked) {
                          setFieldError("customFields." + label, "");
                        }
                      }
                      setFieldTouched("customFields." + label, true);
                    }}
                    name={option}
                  />
                }
                label={option}
              />
            ))}
          </FormGroup>
        </FormControl>
      );

    case "date":
      return (
        <DatePicker
          {...commonProps}
          value={new Date(values.customFields[label] as string)}
          onChange={(e) =>
            setFieldValue("customFields." + label, e?.toISOString() || "")
          }
          onBlur={() => setFieldTouched("customFields." + label, true)}
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
          {...commonProps}
          value={dayjs(values.customFields[label] as string)}
          onChange={(e) =>
            setFieldValue("customFields." + label, e?.toISOString() || "")
          }
          onBlur={() => setFieldTouched("customFields." + label, true)}
        />
      );

    case "radio":
      return (
        <FormControl className="flex">
          <RadioGroup
            {...commonProps}
            value={values.customFields[label] as string}
            onChange={(e) =>
              setFieldValue("customFields." + label, e.target.value)
            }
            onBlur={() => setFieldTouched("customFields." + label, true)}
            name={label}
            className=""
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "10px",
            }}
          >
            {options?.map((option) => (
              <FormControlLabel
                key={option}
                className="capitalize"
                value={option}
                control={<Radio />}
                label={option}
              />
            ))}
          </RadioGroup>
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
        </FormControl>
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
            placeholder={`Enter ${label}`}
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