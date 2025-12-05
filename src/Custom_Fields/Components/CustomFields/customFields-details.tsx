'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import { ImageGallery } from '@/components/ui/image-gallery';
import { useCustomFields } from '@/Custom_Fields/hooks/use-customFields';
import useRoles from '@/hooks/useRoles';
import { format } from 'date-fns';
import { Dayjs } from 'dayjs';

interface FileData {
  base64: string;
  name: string;
  type: string;
  size: number;
}

interface FormValues {
  customFields: {
    [key: string]:
      | string
      | number
      | boolean
      | string[]
      | FileData[]
      | FileList
      | File[]
      | Dayjs;
  };
}

function CustomFieldsData({ customFields: cfWOFormatting }: FormValues) {
  const { customFields: cfMetaData } = useCustomFields();
  const role = useRoles();

  // Collect private fields for interviewer and candidate
  const fieldsPrivateFromInterviewer: string[] = [];
  const fieldsPrivateFromCandidate: string[] = [];
  const fieldsNotRegisteredHere: string[] = [];

  const allFieldKeys = new Set<string>();
  Object.values(cfMetaData).forEach((form) => {
    form.fields.forEach((field) => {
      allFieldKeys.add(field.label);
    });
  });

  Object.values(cfMetaData).forEach((form) => {
    form.fields.forEach((field) => {
      if (field.privateInt) {
        fieldsPrivateFromInterviewer.push(field.label);
      }
      if (field.private) {
        fieldsPrivateFromCandidate.push(field.label);
      }
      if (!allFieldKeys.has(field.label)) {
        fieldsNotRegisteredHere.push(field.label);
      }
    });
  });

  const customFields = Object.fromEntries(
    Object.entries(cfWOFormatting).filter(([key, value]) => {
      if (
        (typeof value === 'string' && value.trim() === '')
        || (Array.isArray(value) && value.length === 0)
      ) {
        return false;
      }

      if (
        role === 'interviewer'
        && fieldsPrivateFromInterviewer.includes(key)
      ) {
        return false;
      }
      if (role === 'candidate' && fieldsPrivateFromCandidate.includes(key)) {
        return false;
      }
      if (!allFieldKeys.has(key)) {
        fieldsNotRegisteredHere.push(key);
      }
      return true;
    }),
  );

  // If no valid custom fields remain, return null
  if (!customFields || Object.keys(customFields).length === 0) {
    return null;
  }

  const getFieldType = (fieldName: string): any | undefined => {
    for (const form of Object.values(cfMetaData)) {
      if (form && typeof form === 'object' && 'fields' in form) {
        const field = (form as any).fields.find(
          (f: any) => f.label === fieldName,
        );
        if (field) {
          return field;
        }
      }
    }
    return undefined;
  };

  // Helper function to format value based on field type
  const formatValue = (value: any, fieldName: string): string => {
    const fieldType = getFieldType(fieldName);

    if (!fieldType) {
      return String(value);
    }

    switch (fieldType) {
      case 'date':
        if (typeof value === 'string' && value) {
          try {
            return format(new Date(value), 'MMM dd, yyyy');
          } catch {
            return String(value);
          }
        }
        return String(value);

      case 'datetime':
        if (typeof value === 'string' && value) {
          try {
            return format(new Date(value), "MMM dd, yyyy 'at' h:mm a");
          } catch {
            return String(value);
          }
        }
        return String(value);

      case 'time':
        if (typeof value === 'string' && value) {
          try {
            // Handle time format (HH:mm)
            const [hours, minutes] = value.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return format(date, 'h:mm a');
          } catch {
            return String(value);
          }
        }
        return String(value);

      default:
        return String(value);
    }
  };

  const sortedCustomFields = Object.entries(customFields).sort(
    ([keyA], [keyB]) => {
      const aField = getFieldType(keyA);
      const bField = getFieldType(keyB);

      const aIsIndividual = aField && (aField.candidateId || aField.jobId);
      const bIsIndividual = bField && (bField.candidateId || bField.jobId);

      if (aIsIndividual && !bIsIndividual) {
        return 1;
      }
      if (!aIsIndividual && bIsIndividual) {
        return -1;
      }

      return (aField?.renderOrder ?? 0) - (bField?.renderOrder ?? 0);
    },
  );

  return (
    <div className="flex flex-col gap-4">
      {sortedCustomFields.map(([key, value]) => {
        if (
          (typeof value === 'string' && value.trim() === '')
          || (Array.isArray(value) && value.length === 0)
          || fieldsNotRegisteredHere.includes(key)
        ) {
          return null;
        }

        return (
          <div key={key} className="space-y-2">
            <Label className="font-semibold text-gray-900 dark:text-white capitalize">
              {key.split(' |||||(')[0]}
            </Label>
            <div className="text-gray-700 dark:text-gray-300">
              {Array.isArray(value) && value.length > 0 && (
                <>
                  {value.some(
                    (file): file is FileData | File => typeof file === 'object'
                      && file !== null
                      && 'type' in file
                      && file.type?.endsWith('pdf'),
                  ) && (
                    <PDFViewer
                      files={value
                        .filter(
                          (file): file is FileData => typeof file === 'object' && 'base64' in file,
                        )
                        .filter((file) => file.type.endsWith('pdf'))
                        .map((file) => ({
                          name: file.name,
                          url: file.base64,
                          type: file.type,
                          size: file.size,
                        }))}
                    />
                  )}
                  {value.some(
                    (file): file is FileData | File => typeof file === 'object'
                      && file !== null
                      && 'type' in file
                      && file.type?.startsWith('image'),
                  ) && (
                    <ImageGallery
                      images={value
                        .filter(
                          (file): file is FileData => typeof file === 'object' && 'base64' in file,
                        )
                        .filter((file) => file.type.startsWith('image'))
                        .map((file) => ({
                          id: file.name,
                          name: file.name,
                          url: file.base64,
                        }))}
                    />
                  )}
                  {value.some(
                    (file): file is FileData | File => typeof file === 'object'
                      && file !== null
                      && 'type' in file
                      && !file.type?.endsWith('pdf')
                      && !file.type?.startsWith('image'),
                  ) && (
                    <div className="flex flex-col gap-2">
                      {value
                        .filter(
                          (file): file is FileData => typeof file === 'object' && 'base64' in file,
                        )
                        .filter(
                          (file) => !file.type.endsWith('pdf')
                            && !file.type.startsWith('image'),
                        )
                        .map((file) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <svg
                                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {(file.size / 1024).toFixed(1)}
                                  {' '}
                                  KB
                                </span>
                              </div>
                            </div>
                            <Button
                              asChild
                              variant="info"
                              size="sm"
                              className="text-xs"
                            >
                              <a href={file.base64} download={file.name}>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                                Download
                              </a>
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                  {value.every(
                    (item): item is string => typeof item === 'string',
                  ) && (
                    <div className="flex flex-wrap gap-2">
                      {value.map((item, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full border border-gray-200 dark:border-gray-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
              {(!Array.isArray(value) || value.length === 0) && (
                <span className="text-gray-700 dark:text-gray-300">
                  {formatValue(value, key)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CustomFieldsData;
