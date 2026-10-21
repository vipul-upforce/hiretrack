'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import dayjs, { Dayjs } from 'dayjs';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { ChipInput } from '@/components/ui/chip-input';
import {
  SelectValue,
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import PasswordField from '@/components/ui/PasswordField';
import TimePicker from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { wierdFileNamePattern } from '@/lib/constants';
import { toast } from 'sonner';
import React, { useEffect } from 'react';
import { getValidatedValue } from '@/Custom_Fields/utils/fieldValueValidator';

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface FieldProps {
  name: string;
  value: unknown;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
}

interface FieldMeta {
  touched: boolean;
  error?: string;
  initialTouched: boolean;
  initialError?: string;
  initialValue?: unknown;
  value: unknown;
}

interface RenderFieldProps {
  getFieldProps: (fieldName: string) => {
    name: string;
    value: string;
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void;
    onBlur: (
      e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void;
    error?: string;
  };
  isEditMode?: boolean;
  label: string;
  setFieldValue: (
    field: string,
    value:
      | string
      | string[]
      | boolean
      | FileData[]
      | (File | FileData)[]
      | Dayjs,
  ) => void;
  type: string;
  values: {
    customFields: {
      [key: string]:
        | string
        | number
        | boolean
        | FileData[]
        | (File | FileData)[]
        | Dayjs
        | string[];
    };
  };
  setFieldTouched: (field: string, value: boolean) => void;
  options: string[] | undefined;
  setFieldError: (field: string, error: string) => void;
  fieldHook?: {
    fieldProps: FieldProps;
    fieldMeta: FieldMeta;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeFiles = (files: any[]): any[] =>
  files.map((file) => {
    // Handle standard File objects
    if (file instanceof File) {
      const sanitizedBaseName = file.name
        .replace(wierdFileNamePattern, '')
        .replace('/ /', '_');
      return new File([file], sanitizedBaseName, {
        type: file.type,
        lastModified: file.lastModified,
      });
    }

    // Handle custom file objects with URL - while renaming
    if (file && typeof file === 'object' && 'name' in file) {
      const sanitizedBaseName = file.name
        ?.replace(wierdFileNamePattern, '')
        ?.replace('/ /', '_');
      return {
        ...file,
        name: sanitizedBaseName,
      };
    }

    // Fallback: return unchanged if neither type matches
    return file;
  });

export function RenderField({
  label,
  type,
  values,
  setFieldValue,
  setFieldTouched,
  options,
  setFieldError,
  fieldHook,
}: RenderFieldProps) {
  // Get and validate the value for this field type
  const rawValue = values.customFields[label];
  const validatedValue = getValidatedValue(rawValue, type);

  // If value was invalid and got reset, update the form value
  useEffect(() => {
    if (rawValue !== validatedValue && validatedValue === '') {
      setFieldValue(`customFields.${label}`, validatedValue);
    }
  }, [rawValue, validatedValue, label, setFieldValue]);

  const commonProps = {
    id: `customFields.${label}`,
    'data-field-name': label,
    // autoFocus: fieldHook?.fieldMeta.error && fieldHook?.fieldMeta.touched,
    className:
      fieldHook?.fieldMeta.touched && fieldHook?.fieldMeta.error
        ? 'border-2 border-red-500'
        : undefined,

    autoFocus: Boolean(
      fieldHook?.fieldMeta.error && fieldHook?.fieldMeta.touched,
    ),
  };

  switch (type) {
    case 'text':
      return (
        <Input
          {...commonProps}
          name={`customFields.${label}`}
          value={String(validatedValue)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFieldValue(`customFields.${label}`, e.target.value);
          }}
          onBlur={() => setFieldTouched(`customFields.${label}`, true)}
          placeholder={`Enter ${label.split(' |||||(')[0]}`}
        />
      );

    case 'password':
      return (
        <div>
          <PasswordField
            {...commonProps}
            name={`customFields.${label}`}
            value={String(validatedValue)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setFieldValue(`customFields.${label}`, e.target.value);
            }}
            onBlur={() => {
              setFieldTouched(`customFields.${label}`, true);
            }}
          />
        </div>
      );

    case 'number':
      return (
        <Input
          {...commonProps}
          type="number"
          name={`customFields.${label}`}
          value={String(validatedValue)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFieldValue(`customFields.${label}`, e.target.value);
          }}
          onBlur={() => setFieldTouched(`customFields.${label}`, true)}
          placeholder={`Enter ${label.split(' |||||(')[0]} in numbers`}
        />
      );

    case 'textarea':
      return (
        <Textarea
          {...commonProps}
          name={`customFields.${label}`}
          value={String(validatedValue)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setFieldValue(`customFields.${label}`, e.target.value);
          }}
          onBlur={() => setFieldTouched(`customFields.${label}`, true)}
          placeholder={`Enter ${label.split(' |||||(')[0]}`}
        />
      );

    case 'select':
      return (
        <Select
          value={String(validatedValue)}
          onValueChange={(value: string) =>
            setFieldValue(`customFields.${label}`, value)
          }
        >
          <SelectTrigger {...commonProps}>
            <SelectValue placeholder={`Select ${label.split(' |||||(')[0]}`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
          {fieldHook?.fieldMeta.value !== '' && (
            <Button
              style={{
                marginLeft: '-10px',
                color: 'rgb(121, 121, 121)',
                display: 'contents',
              }}
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                setFieldValue(`customFields.${label}`, '');
              }}
            >
              Clear
            </Button>
          )}
        </Select>
      );

    case 'checkbox': {
      const checkboxValue = (validatedValue as string[]) || [];
      return (
        <div className="flex flex-col gap-2">
          {options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${label}-${option}`}
                className="capitalize"
                checked={checkboxValue.includes(option)}
                onCheckedChange={(checked) => {
                  if (checkboxValue.length === 0) {
                    setFieldValue(`customFields.${label}`, [option]);
                    setFieldError(`customFields.${label}`, '');
                  } else {
                    const newValues = checked
                      ? [...checkboxValue, option]
                      : checkboxValue.filter((value) => value !== option);

                    setFieldValue(`customFields.${label}`, newValues);
                    if (newValues.length > 0) {
                      setFieldError(`customFields.${label}`, '');
                    }
                  }
                  setFieldTouched(`customFields.${label}`, true);
                }}
                onBlur={() => {
                  if (checkboxValue.length === 0) {
                    setFieldError(`customFields.${label}`, '');
                  }
                  setFieldTouched(`customFields.${label}`, true);
                }}
              />
              <Label
                htmlFor={`${label}-${option}`}
                className="font-medium capitalize"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    // case "date":
    //   return (
    //     <DatePicker
    //       value={new Date(values.customFields[label] as string)}
    //       onChange={(e) =>
    //         setFieldValue(
    //           "customFields." + label,
    //           e && e instanceof Date ? e.toISOString() : ""
    //         )
    //       }
    //       onClose={() => setFieldTouched("customFields." + label, true)}
    //     />
    //   );

    case 'date': {
      const dateString = validatedValue as string;
      const NewValue = dateString ? dayjs(dateString) : null;
      const dateValue =
        NewValue && NewValue.isValid() ? NewValue.toDate() : null;

      return (
        <DatePicker
          value={dateValue || null}
          onChange={(e) => {
            let selectedDate: string | null = null;

            if (e && typeof e === 'object' && 'toDate' in e) {
              const date = (e as { toDate: () => Date }).toDate();
              selectedDate =
                date && !Number.isNaN(date.getTime())
                  ? dayjs(date).format('MM/DD/YYYY')
                  : null;
            } else if (e && e instanceof Date && !Number.isNaN(e.getTime())) {
              selectedDate = dayjs(e).format('MM/DD/YYYY');
            }

            setFieldValue(`customFields.${label}`, selectedDate || '');
          }}
          onClose={() => setFieldTouched(`customFields.${label}`, true)}
          format="MM/DD/YYYY"
          placeholder="MM/DD/YYYY"
          showTimePicker={false}
          showNowButton={false}
        />
      );
    }
    case 'datetime': {
      const datetimeString = validatedValue as string;
      return (
        <DateTimePicker
          value={datetimeString ? dayjs(datetimeString) : null}
          onChange={(e) => {
            if (e) {
              const formatted = e.format('MM/DD/YYYY hh:mm A');
              setFieldValue(`customFields.${label}`, formatted);
            } else {
              setFieldValue(`customFields.${label}`, '');
            }
          }}
        />
      );
    }

    case 'time':
      return (
        <TimePicker
          {...commonProps}
          name={`customFields.${label}`}
          value={validatedValue as string}
          onChange={(e) => {
            setFieldValue(`customFields.${label}`, e);
          }}
          onBlur={() => setFieldTouched(`customFields.${label}`, true)}
        />
      );
    case 'radio':
      return (
        <div className="flex items-center gap-4">
          <RadioGroup
            value={validatedValue as string}
            onValueChange={(value) =>
              setFieldValue(`customFields.${label}`, value)
            }
            className="flex flex-col gap-2"
          >
            {options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${label}-${option}`} />
                <Label
                  htmlFor={`${label}-${option}`}
                  className="font-medium capitalize"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button
            variant="link"
            onClick={(e) => {
              e.preventDefault();
              setFieldValue(`customFields.${label}`, '');
            }}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        </div>
      );

    case 'file': {
      const fileValue = (validatedValue as FileData[]) || [];
      return (
        <div>
          <FileDropZone
            {...commonProps}
            value={fileValue}
            onFilesChange={async (files: File[] | FileData[]) => {
              const sanitizedFiles = sanitizeFiles(files);
              if (sanitizedFiles.length > 30) {
                toast.error('Limit Exceeded', {
                  description: 'You cannot upload more than 30 files.',
                });
                return;
              }

              try {
                // Separate new File objects from existing FileData objects (with base64/url)
                const newFiles: File[] = [];
                const existingFiles: FileData[] = [];

                sanitizedFiles.forEach((file) => {
                  // Check if it's a File object (new file - keep as File)
                  if (file instanceof File) {
                    newFiles.push(file);
                  }
                  // Check if it's an existing file with base64 or url (keep as-is)
                  else if (
                    typeof file === 'object' &&
                    file !== null &&
                    ('base64' in file || 'url' in file)
                  ) {
                    existingFiles.push(file as FileData);
                  }
                });

                // Check for duplicate file names across all files
                const allFileNames = [
                  ...newFiles.map((f) => f.name),
                  ...existingFiles.map((f) => f.name),
                ];
                const hasDuplicates =
                  new Set(allFileNames).size !== allFileNames.length;

                if (hasDuplicates) {
                  toast.error('Duplicate Files', {
                    description: 'Duplicate file names are not allowed.',
                  });
                  return;
                }

                // Store File objects directly for new files (like attachments pattern)
                // Keep existing files as-is (with base64/url for backward compatibility)
                const combinedFiles: Array<File | FileData> = [
                  ...existingFiles,
                  ...newFiles,
                ];

                setFieldValue(`customFields.${label}`, combinedFiles);
              } catch {
                toast.error('Upload Error', {
                  description: 'Failed to process files.',
                });
              }
            }}
            existingFiles={
              Array.isArray(fileValue) && fileValue.length > 0
                ? sanitizeFiles(
                    fileValue.map((file) => ({
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      url: file.base64 || '',
                      preview: file.base64,
                    })),
                  )
                : []
            }
          />
        </div>
      );
    }

    case 'multiSelect': {
      const multiSelectValue = (validatedValue as string[]) || [];
      return (
        <div className="space-y-2">
          <ChipInput
            {...commonProps}
            value={multiSelectValue}
            onChange={(newOptions) => {
              setFieldValue(
                `customFields.${label}`,
                newOptions
                  .map((option) => option.trim())
                  .filter((option) => option.length > 0),
              );
            }}
            onBlur={() => setFieldTouched(`customFields.${label}`, true)}
            placeholder={`Enter ${label.split(' |||||(')[0]}`}
            onSuggestionClick={(suggestion) => {
              if (suggestion.trim() && !multiSelectValue.includes(suggestion)) {
                setFieldValue(`customFields.${label}`, [
                  ...multiSelectValue,
                  suggestion,
                ]);
              }
            }}
            suggestions={
              options?.filter((option) => !multiSelectValue.includes(option)) ||
              []
            }
          />
        </div>
      );
    }

    default:
      return null;
  }
}
