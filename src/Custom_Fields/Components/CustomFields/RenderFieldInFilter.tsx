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
  label: string;
  type: string;
  value: string | string[] | boolean | FileData[] | Dayjs | [Dayjs, Dayjs] | undefined;
  onChange?: (value: string | string[] | boolean | FileData[] | Dayjs | [Dayjs, Dayjs]) => void;
  onBlur?: (value: string | string[] | boolean | FileData[] | Dayjs | [Dayjs, Dayjs] |Date) => void;
  options?: string[];
  error?: string;
  min?: Dayjs | [Dayjs, Dayjs] | undefined;
  max?: Dayjs | [Dayjs, Dayjs] | undefined;
  name?:string
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const RenderFieldInFilter = ({
  label,
  type,
  value,
  onChange,
  onBlur,
  options=[],
  error,
  min,
  max,
  name
}: RenderFieldProps) => {
    console.log('type :>> ', type);
  switch (type) {
    case "text":
      return (
        <Input
          id={label}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => onBlur?.(e.target.value)}
          placeholder={`Enter ${label}`}
        />
      );

    case "password":
      return (
        <PasswordField
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) => onBlur?.(e.target.value)}
          name={name as string}
        />
      );

    case "number":
      return (
        <Input
          type="number"
          id={label}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
         onBlur={(e: React.ChangeEvent<HTMLInputElement>) => onBlur?.(e.target.value)}
          placeholder={`Enter ${label} in numbers`}
        />
      );

    case "textarea":
      return (
        <Textarea
          id={label}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value)}
          onBlur={(e: React.ChangeEvent<HTMLTextAreaElement>) => onBlur?.(e.target.value)}
          placeholder={`Enter ${label}`}
        />
      );

    case "select":
      return (
        <Select
          value={value as string}
          onValueChange={(newValue: string) => onChange?.(newValue)}
        >
          <SelectTrigger>
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
              onChange?.("");
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
                    checked={(value as string[])?.includes(option)}
                    className="capitalize"
                    onChange={(e) => {
                      const currentValues = (value as string[]) || [];
                      const newValues = currentValues.includes(option)
                        ? currentValues.filter((val) => val !== option)
                        : [...currentValues, option];
                      onChange?.(newValues);
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
        <div className="flex gap-2">
          <DatePicker
            value={value ? (value as [Dayjs, Dayjs])[0]?.toDate() || new Date() : new Date()}
            onChange={(date) => {
              const newRange = [
                date ? dayjs(date) : undefined,
                (value as [Dayjs, Dayjs])?.[1],
              ] as [Dayjs, Dayjs];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            // min={min}
            // max={max}
          />
          <DatePicker
            value={value ? (value as [Dayjs, Dayjs])[1]?.toDate() || new Date() : new Date()}
            onChange={(date) => {
              const newRange = [
                (value as [Dayjs, Dayjs])?.[0],
                date ? dayjs(date) : undefined,
              ] as [Dayjs, Dayjs];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            // min={min}
            // max={max}
          />
        </div>
      );

    case "time":
      return (
        <div className="flex gap-2">
          <TimePicker
            value={(value as [string, string])?.[0] || ""}
            onChange={(time) => {
              const newRange = [time, (value as [string, string])?.[1] || ""] as [string, string];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            name={name as string}
          />
          <TimePicker
            value={(value as [string, string])?.[1] || ""}
            onChange={(time) => {
              const newRange = [(value as [string, string])?.[0] || "", time] as [string, string];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            name={name as string}

          />
        </div>
      );

    case "datetime":
      return (
        <div className="flex gap-2">
          <DateTimePicker
            value={value ? (value as [Dayjs, Dayjs])[0] : undefined}
            onChange={(date) => {
              const newRange = [
                date,
                (value as [Dayjs, Dayjs])?.[1],
              ] as [Dayjs, Dayjs];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            // min={min ? dayjs(min) : undefined}
            // max={max ? dayjs(max) : undefined}
          />
          <DateTimePicker
            value={value ? (value as [Dayjs, Dayjs])[1] : undefined}
            onChange={(date) => {
              const newRange = [
                (value as [Dayjs, Dayjs])?.[0],
                date,
              ] as [Dayjs, Dayjs];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            // min={min ? dayjs(min) : undefined}
            // max={max ? dayjs(max) : undefined}
          />
        </div>
      );

    case "radio":
      return (
        <FormControl className="flex">
          <RadioGroup
            value={value as string}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={() => {}}
            name={label}
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
              onChange?.("");
            }}
          >
            Clear
          </Button>
        </FormControl>
      );

    case "file":
      return (
        <FileDropZone
          value={value as FileData[]}
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
              const hasDuplicates = new Set(fileNames).size !== fileNames.length;
              if (hasDuplicates) {
                return;
              }
              onChange?.(base64Files);
            } catch {
              // Handle error
            }
          }}
          existingFiles={
            Array.isArray(value)
              ? (value as FileData[]).map((file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  preview: file.base64,
                }))
              : []
          }
        />
      );

    case "multiSelect":
      return (
        <ChipInput
          value={(value as string[]) || []}
          onChange={(newOptions) => {
            onChange?.(
              newOptions
                .map((option) => option.trim())
                .filter((option) => option.length > 0)
            );
          }}
          placeholder={`Enter ${label}`}
          onSuggestionClick={(suggestion) => {
            const currentValues = (value as string[]) || [];
            if (suggestion.trim() && !currentValues.includes(suggestion)) {
              onChange?.([...currentValues, suggestion]);
            }
          }}
          suggestions={
            options?.filter(
              (option) => !(value as string[])?.includes(option)
            ) || []
          }
        />
      );

    default:
      return null;
  }
};