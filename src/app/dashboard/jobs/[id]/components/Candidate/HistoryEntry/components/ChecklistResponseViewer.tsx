import { useState } from 'react';
import { ClipboardCheck, ChevronDown, ChevronRight } from 'lucide-react';
import useRoles from '@/hooks/useRoles';
import { ChecklistResponseViewerProps } from '../types';
import { useChecklistFormatting } from '../hooks/useChecklistFormatting.tsx';

/**
 * Component to display checklist responses in an expandable view
 */
export function ChecklistResponseViewer({
  checklistForm,
}: ChecklistResponseViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const role = useRoles();
  const { formatValue } = useChecklistFormatting();

  if (!checklistForm) return null;

  const responsesArray =
    checklistForm.responses instanceof Map
      ? Array.from(checklistForm.responses.entries())
      : Object.entries(checklistForm.responses || {});

  const visibleResponses = responsesArray.filter(
    ([, resp]: [string, { visibleInHistory: string[] }]) =>
      Array.isArray(resp?.visibleInHistory)
        ? resp.visibleInHistory.includes(role)
        : true,
  );

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-black/50">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded);
          }
        }}
        className="cursor-pointer border-b border-gray-200 p-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {checklistForm.checklistName}
            </span>
          </div>
          <div className="flex h-6 w-6 items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Completed for {checklistForm.laneName} lane
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 p-3">
          {visibleResponses
            .filter(([, response]) => {
              const responseData =
                (response as { value: string })?.value !== undefined
                  ? response
                  : response;
              const value = (responseData as { value: string })?.value;
              if (
                (typeof value === 'string' && value.trim() === '') ||
                (Array.isArray(value) && value.length === 0) ||
                !value
              ) {
                return false;
              }
              return true;
            })
            .map(([fieldId, response]) => {
              const responseData =
                (response as { value: string })?.value !== undefined
                  ? response
                  : response;
              const fieldLabel =
                (responseData as { fieldLabel: string })?.fieldLabel || fieldId;
              const fieldType =
                (responseData as { fieldType: string })?.fieldType || 'text';
              const value = (responseData as { value: string })?.value;

              return (
                <div
                  key={fieldId}
                  className="border-l-2 border-blue-200 pl-3 dark:border-blue-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        {fieldLabel}
                      </label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {formatValue(value, fieldType)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {responsesArray.length === 0 && (
            <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
              No responses recorded
            </div>
          )}
        </div>
      )}
    </div>
  );
}






