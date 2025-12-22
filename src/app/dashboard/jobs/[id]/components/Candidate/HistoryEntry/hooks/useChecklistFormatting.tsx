import React from 'react';

/**
 * Hook to format checklist field values based on field type
 */
export function useChecklistFormatting() {
  const formatValue = (value: unknown, fieldType: string): React.ReactNode => {
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
      case 'password':
        return value ? '••••••••' : 'N/A';
      case 'file':
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div className="space-y-2">
              {value.map((file) => (
                <div
                  key={`${file.name}`}
                  className="flex items-center justify-between rounded bg-gray-100 p-2 dark:bg-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = file.base64;
                      link.download = file.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          );
        }
        return 'No files uploaded';
      default:
        return String(value);
    }
  };

  return { formatValue };
}
