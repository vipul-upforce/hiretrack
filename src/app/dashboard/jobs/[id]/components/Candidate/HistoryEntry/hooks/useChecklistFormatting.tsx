import { Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import type { CustomFieldFile } from '@/lib/fileUtils';

/** Optional context for file-type fields: use .files when stored for display/download */
export interface FormatValueFileOptions {
  files?: CustomFieldFile[];
}

/**
 * Hook to format checklist field values based on field type
 */
export function useChecklistFormatting() {
  const [showPassword, setShowPassword] = useState(false);
  const formatValue = (
    value: unknown,
    fieldType: string,
    options?: FormatValueFileOptions,
  ): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';

    switch (fieldType) {
      case 'checkbox':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value ? 'Yes' : 'No';
      case 'multiSelect':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'date':
        return value ? new Date(String(value)).toLocaleDateString() : 'N/A';
      case 'time':
        return value ? String(value) : 'N/A';
      case 'datetime':
        return value ? new Date(String(value)).toLocaleString() : 'N/A';
      case 'password': {
        if (!value) return 'N/A';

        const stringValue = String(value);
        const hiddenPassword = '•'.repeat(stringValue.length);

        return (
          <span className="inline-flex items-center gap-2">
            <span>{showPassword ? stringValue : hiddenPassword}</span>
            <button
              type="button"
              className="text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={0}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </span>
        );
      }
      case 'file': {
        type FileItem = { name: string; size: number; href: string };
        let filesList: FileItem[];
        if (options?.files && options.files.length > 0) {
          filesList = options.files.map((f) => ({
            name: (f as { name?: string }).name ?? 'file',
            size: Number((f as { size?: number }).size) || 0,
            href:
              (f as { url?: string }).url ?? (f as { base64?: string }).base64 ?? '',
          }));
        } else if (Array.isArray(value)) {
          filesList = value.map((item) => {
            if (typeof item === 'object' && item !== null && 'name' in item) {
              const o = item as { name?: string; size?: number; url?: string; base64?: string };
              return {
                name: o.name ?? 'file',
                size: Number(o.size) || 0,
                href: o.url ?? o.base64 ?? '',
              };
            }
            return {
              name: typeof item === 'string' ? item : 'file',
              size: 0,
              href: '',
            };
          });
        } else {
          filesList = [];
        }

        if (filesList.length === 0) return 'No files uploaded';

        return (
          <div className="space-y-2">
            {filesList.map((file) => (
              <div
                key={`${file.name}-${file.size}-${file.href}`}
                className="flex items-center justify-between rounded bg-gray-100 p-2 dark:bg-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{file.name}</span>
                  {file.size > 0 && (
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
                {file.href ? (
                  <a
                    href={file.href}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Download
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        );
      }
      default:
        return String(value);
    }
  };

  return { formatValue };
}
