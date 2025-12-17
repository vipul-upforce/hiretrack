import { AlertTriangle } from 'lucide-react';

import type { FormikHelpers } from 'formik';

import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';

import type { ActiveEditor } from './useTemplateVariableInsertion';
import type { TemplateVariableAnalysis } from './useTemplateVariableAnalysis';

interface VariablePanelProps {
  activeEditor: ActiveEditor;
  analysis: TemplateVariableAnalysis;
  onInsertVariable: (
    variable: string,
    setFieldValue: FormikHelpers<IEmailTemplatesConfig>['setFieldValue'],
    values: IEmailTemplatesConfig,
  ) => void;
  setFieldValue: FormikHelpers<IEmailTemplatesConfig>['setFieldValue'];
  values: IEmailTemplatesConfig;
}

function VariablePillButton({
  variable,
  activeEditor,
  onClick,
  tone,
}: {
  variable: string;
  activeEditor: ActiveEditor;
  onClick: () => void;
  tone: 'green' | 'gray';
}) {
  const base =
    'rounded-md border px-3 py-2 font-mono text-xs transition-all duration-200';

  const enabledTone =
    tone === 'green'
      ? 'cursor-pointer border-green-400 bg-green-100 text-green-800 hover:border-green-600 hover:bg-green-200 hover:shadow-sm dark:border-green-600 dark:bg-green-950/20 dark:text-green-400 dark:hover:border-green-600 dark:hover:bg-green-900/20'
      : 'cursor-pointer border-gray-400 bg-gray-100 text-gray-700 hover:border-gray-500 hover:bg-gray-200 hover:shadow-sm dark:border-gray-600 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800';

  const disabledTone =
    tone === 'green'
      ? 'cursor-not-allowed border-green-300 bg-green-100 text-green-600 opacity-50 dark:border-green-700 dark:bg-green-950/20 dark:text-green-500'
      : 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 opacity-50 dark:border-gray-700 dark:bg-black dark:text-gray-500';

  const isEnabled = Boolean(activeEditor);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${isEnabled ? enabledTone : disabledTone}`}
      disabled={!isEnabled}
      title={
        isEnabled
          ? `Click to insert {{${variable}}} at cursor position`
          : 'Select an editor first'
      }
    >
      {`{{${variable}}}`}
    </button>
  );
}

export function VariablePanel({
  activeEditor,
  analysis,
  onInsertVariable,
  setFieldValue,
  values,
}: VariablePanelProps) {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <div>
        <p className="mb-2 font-medium">
          Available Variables:
          {activeEditor ? (
            <span className="ml-2 text-xs text-green-600">
              (Click to insert into{' '}
              {activeEditor === 'subject' ? 'subject' : 'HTML editor'})
            </span>
          ) : (
            <span className="ml-2 text-xs text-gray-500">
              (Click in an editor field first)
            </span>
          )}
        </p>

        {analysis.invalid.length > 0 && (
          <div className="border-t pt-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="font-medium text-red-700 dark:text-red-400">
                Invalid Variables Found ({analysis.invalid.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {analysis.invalid.map((variable) => (
                <div
                  key={variable}
                  className="cursor-not-allowed rounded-md border border-red-300 bg-red-50 px-3 py-2 font-mono text-red-700 opacity-75 dark:border-red-600 dark:bg-red-950/20 dark:text-red-400"
                  title={`Invalid variable: {{${variable}}} is not available for this template`}
                >
                  {`{{${variable}}}`}
                </div>
              ))}
            </div>
            <p className="mb-1 mt-2 text-xs text-red-600 dark:text-red-400">
              Remove these variables from your template or they will not be
              replaced with actual values.
            </p>
          </div>
        )}

        {analysis.used.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">
              ✓ Used Variables ({analysis.used.length})
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {analysis.used.map((variable) => (
                <VariablePillButton
                  key={variable}
                  variable={variable}
                  activeEditor={activeEditor}
                  tone="green"
                  onClick={() =>
                    onInsertVariable(variable, setFieldValue, values)
                  }
                />
              ))}
            </div>
          </div>
        )}

        {analysis.unused.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
              ○ Unused Variables ({analysis.unused.length})
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {analysis.unused.map((variable) => (
                <VariablePillButton
                  key={variable}
                  variable={variable}
                  activeEditor={activeEditor}
                  tone="gray"
                  onClick={() =>
                    onInsertVariable(variable, setFieldValue, values)
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
