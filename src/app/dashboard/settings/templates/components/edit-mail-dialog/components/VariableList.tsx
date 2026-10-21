import { AlertTriangle } from 'lucide-react';

interface VariableListProps {
  variables: string[];
  activeEditor: 'subject' | 'html' | null;
  onInsert: (variable: string) => void;
  variant: 'used' | 'unused' | 'invalid';
}

export function VariableList({
  variables,
  activeEditor,
  onInsert,
  variant,
}: VariableListProps) {
  if (variables.length === 0) return null;

  const getVariantStyles = () => {
    if (variant === 'used') {
      return activeEditor
        ? 'cursor-pointer border-green-400 bg-green-100 text-green-800 hover:border-green-600 hover:bg-green-200 hover:shadow-sm dark:border-green-600 dark:bg-green-950/20 dark:text-green-400 dark:hover:border-green-600 dark:hover:bg-green-900/20'
        : 'cursor-not-allowed border-green-300 bg-green-100 text-green-600 opacity-50 dark:border-green-700 dark:bg-green-950/20 dark:text-green-500';
    }
    if (variant === 'unused') {
      return activeEditor
        ? 'cursor-pointer border-gray-400 bg-gray-100 text-gray-700 hover:border-gray-500 hover:bg-gray-200 hover:shadow-sm dark:border-gray-600 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
        : 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 opacity-50 dark:border-gray-700 dark:bg-black dark:text-gray-500';
    }
    return 'cursor-not-allowed border-red-300 bg-red-50 px-3 py-2 font-mono text-red-700 opacity-75 dark:border-red-600 dark:bg-red-950/20 dark:text-red-400';
  };

  const getLabel = () => {
    if (variant === 'used') return `✓ Used Variables (${variables.length})`;
    if (variant === 'unused') return `○ Unused Variables (${variables.length})`;
    return `Invalid Variables Found (${variables.length})`;
  };

  const getLabelColor = () => {
    if (variant === 'used')
      return 'text-green-700 dark:text-green-400';
    if (variant === 'unused') return 'text-gray-600 dark:text-gray-400';
    return 'text-red-700 dark:text-red-400';
  };

  if (variant === 'invalid') {
    return (
      <div className="border-t pt-3">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className={`font-medium ${getLabelColor()}`}>{getLabel()}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {variables.map((variable) => (
            <div
              key={variable}
              className={getVariantStyles()}
              title={`Invalid variable: {{${variable}}} is not available for this template`}
            >
              {`{{${variable}}}`}
            </div>
          ))}
        </div>
        <p className="mb-1 mt-2 text-xs text-red-600 dark:text-red-400">
          Remove these variables from your template or they will not be replaced
          with actual values.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <p className={`mb-1 text-xs font-medium ${getLabelColor()}`}>
        {getLabel()}
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        {variables.map((variable) => (
          <button
            key={variable}
            type="button"
            onClick={() => onInsert(variable)}
            className={`rounded-md border px-3 py-2 font-mono transition-all duration-200 ${getVariantStyles()}`}
            disabled={!activeEditor}
            title={
              activeEditor
                ? `Click to insert {{${variable}}} at cursor position`
                : 'Select an editor first'
            }
          >
            {`{{${variable}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

