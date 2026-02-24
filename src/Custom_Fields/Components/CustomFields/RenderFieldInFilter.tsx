'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import React from 'react';

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface RenderFieldProps {
  label: string;
  type: string;
  value:
    | string
    | string[]
    | boolean
    | FileData[]
    | Dayjs
    | [Dayjs, Dayjs]
    | undefined;
  onChange?: (
    value: string | string[] | boolean | FileData[] | Dayjs | [Dayjs, Dayjs],
  ) => void;
  onBlur?: (
    value:
      | string
      | string[]
      | boolean
      | FileData[]
      | Dayjs
      | [Dayjs, Dayjs]
      | Date,
  ) => void;
  options?: string[];
  name?: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export function RenderFieldInFilter({
  label,
  type,
  value,
  onChange,
  onBlur,
  options = [],
  name,
}: RenderFieldProps) {
  switch (type) {
    case 'text':
      return (
        <Input
          id={label}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange?.(e.target.value)
          }
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) =>
            onBlur?.(e.target.value)
          }
          placeholder={`Enter ${label}`}
        />
      );

    case 'password':
      return (
        <PasswordField
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange?.(e.target.value)
          }
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) =>
            onBlur?.(e.target.value)
          }
          name={name as string}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          id={label}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange?.(e.target.value)
          }
          onBlur={(e: React.ChangeEvent<HTMLInputElement>) =>
            onBlur?.(e.target.value)
          }
          placeholder={`Enter ${label} in numbers`}
        />
      );

    case 'textarea':
      return (
        <Textarea
          id={label}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange?.(e.target.value)
          }
          onBlur={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onBlur?.(e.target.value)
          }
          placeholder={`Enter ${label}`}
        />
      );

    case 'select':
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
              marginLeft: '-10px',
              color: 'rgb(121, 121, 121)',
              display: 'contents',
            }}
            variant="link"
            onClick={(e) => {
              e.preventDefault();
              onChange?.('');
            }}
          >
            Clear
          </Button>
        </Select>
      );

    case 'checkbox':
      return (
        <div className="flex flex-col gap-2">
          {options?.map((option, index) => (
            <div className="flex items-center space-x-2" key={option}>
              <Checkbox
                id={`${option}-${index}`}
                checked={(value as string[])?.includes(option)}
                onCheckedChange={(checked) => {
                  const currentValues = (value as string[]) || [];
                  const newValues = checked
                    ? [...currentValues, option]
                    : currentValues.filter((val) => val !== option);
                  onChange?.(newValues);
                }}
              />
              <Label htmlFor={`${option}-${index}`}>{option}</Label>
            </div>
          ))}
        </div>
      );

    case 'date':
      return (
        <div className="flex gap-2">
          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value && (value as [Dayjs, Dayjs])[0] ? (
                  format((value as [Dayjs, Dayjs])[0].toDate(), 'PPP')
                ) : (
                  <span>Start date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <DatePicker
                value={
                  value && (value as [Dayjs, Dayjs])[0]
                    ? (value as [Dayjs, Dayjs])[0].toDate()
                    : null
                }
                onChange={(date) => {
                  const newRange = [
                    date ? dayjs(date as Date) : undefined,
                    (value as [Dayjs, Dayjs])?.[1],
                  ] as [Dayjs, Dayjs];
                  onChange?.(newRange);
                }}
                showTimePicker={false}
                format="MM/DD/YYYY"
                placeholder="Select start date"
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value && (value as [Dayjs, Dayjs])[1] ? (
                  format((value as [Dayjs, Dayjs])[1].toDate(), 'PPP')
                ) : (
                  <span>End date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <DatePicker
                value={
                  value && (value as [Dayjs, Dayjs])[1]
                    ? (value as [Dayjs, Dayjs])[1].toDate()
                    : null
                }
                onChange={(date) => {
                  const newRange = [
                    (value as [Dayjs, Dayjs])?.[0],
                    date ? dayjs(date as Date) : undefined,
                  ] as [Dayjs, Dayjs];
                  onChange?.(newRange);
                }}
                showTimePicker={false}
                format="MM/DD/YYYY"
                placeholder="Select end date"
              />
            </PopoverContent>
          </Popover>
        </div>
      );

    case 'time':
      return (
        <div className="flex gap-2">
          <TimePicker
            value={(value as [string, string])?.[0] || ''}
            onChange={(time) => {
              const newRange = [
                time,
                (value as [string, string])?.[1] || '',
              ] as [string, string];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            name={name as string}
          />
          <TimePicker
            value={(value as [string, string])?.[1] || ''}
            onChange={(time) => {
              const newRange = [
                (value as [string, string])?.[0] || '',
                time,
              ] as [string, string];
              onChange?.(newRange);
            }}
            onBlur={() => {}}
            name={name as string}
          />
        </div>
      );

    case 'datetime':
      return (
        <div className="flex gap-2">
          {/* Start DateTime */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value && (value as [Dayjs, Dayjs])[0] ? (
                  format((value as [Dayjs, Dayjs])[0].toDate(), 'PPp')
                ) : (
                  <span>Start date & time</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DateTimePicker
                value={
                  value && (value as [Dayjs, Dayjs])[0]
                    ? (value as [Dayjs, Dayjs])[0]
                    : undefined
                }
                onChange={(date) => {
                  const newRange = [
                    date || undefined,
                    (value as [Dayjs, Dayjs])?.[1],
                  ] as [Dayjs | undefined, Dayjs | undefined];
                  onChange?.(newRange as [Dayjs, Dayjs]);
                }}
                placeholder="Select start date & time"
              />
            </PopoverContent>
          </Popover>

          {/* End DateTime */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value && (value as [Dayjs, Dayjs])[1] ? (
                  format((value as [Dayjs, Dayjs])[1].toDate(), 'PPp')
                ) : (
                  <span>End date & time</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DateTimePicker
                value={
                  value && (value as [Dayjs, Dayjs])[1]
                    ? (value as [Dayjs, Dayjs])[1]
                    : undefined
                }
                onChange={(date) => {
                  const newRange = [
                    (value as [Dayjs, Dayjs])?.[0],
                    date || undefined,
                  ] as [Dayjs | undefined, Dayjs | undefined];
                  onChange?.(newRange as [Dayjs, Dayjs]);
                }}
                placeholder="Select end date & time"
              />
            </PopoverContent>
          </Popover>
        </div>
      );

    case 'radio':
      return (
        <RadioGroup
          value={value as string}
          onValueChange={(newValue) => onChange?.(newValue)}
          className="flex flex-col gap-2"
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
      );

    case 'file':
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
                  } else if ((file as FileData).base64 === '') {
                    fileurl = '';
                  } else {
                    fileurl = await fileToBase64(file as File);
                  }
                  return {
                    base64: fileurl,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                  };
                }),
              );
              const fileNames = base64Files.map((file) => file.name);
              const hasDuplicates =
                new Set(fileNames).size !== fileNames.length;
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

    case 'multiSelect':
      return (
        <ChipInput
          value={(value as string[]) || []}
          onChange={(newOptions) => {
            onChange?.(
              newOptions
                .map((option) => option.trim())
                .filter((option) => option.length > 0),
            );
          }}
          //   onBlur={onBlur}
          placeholder={`Enter ${label}`}
          onSuggestionClick={(suggestion) => {
            const currentValues = (value as string[]) || [];
            if (suggestion.trim() && !currentValues.includes(suggestion)) {
              onChange?.([...currentValues, suggestion]);
            }
          }}
          suggestions={
            options?.filter(
              (option) => !(value as string[])?.includes(option),
            ) || []
          }
        />
      );

    default:
      return null;
  }
}
