/**
 * Candidate Card Custom Fields Component
 * Displays custom fields that are configured to show on card
 */

import { Candidate } from '@/types/candidate';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
import { Badge } from '@/components/ui/badge';
import AttachmentsPopover from '../Remarks/attachments-popover';

interface CandidateCardCustomFieldsProps {
  candidate: Candidate;
}

export function CandidateCardCustomFields({
  candidate,
}: CandidateCardCustomFieldsProps) {
  const { formNameObject } = useCustomForm('Candidate');

  const visibleFields = Object.entries(candidate.customFields || {}).filter(
    ([key, value]) => {
      const field = formNameObject?.fields.find((f) => f.label === key);
      if (field?.candidateId && field.candidateId !== candidate._id)
        return false;
      return (
        field?.showOnCard &&
        value != null &&
        value !== '' &&
        (!Array.isArray(value) || value.length > 0)
      );
    },
  );

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 space-y-2">
      {visibleFields.map(([key, value]) => (
        <div key={key} className="flex flex-row items-center gap-1 text-sm">
          <span className="truncate capitalize text-gray-600 dark:text-gray-400">
            {key.split(' |||||(')[0]}
          </span>
          {(() => {
            if (typeof value === 'string') {
              return (
                <span className="font-semibold text-orange-700 dark:text-orange-400">
                  {value}
                </span>
              );
            }

            // Only treat as attachments if array is of objects with a file shape
            if (
              Array.isArray(value) &&
              value.length > 0 &&
              value.every(
                (v) =>
                  typeof v === 'object' &&
                  v !== null &&
                  ('name' in v || 'base64' in v || 'type' in v),
              )
            ) {
              return (
                <div>
                  <AttachmentsPopover
                    attachments={value.map((file, index) => ({
                      id: `${key}-${index}-${(file as { name?: string }).name || ''}`,
                      name: (file as { name?: string }).name || '',
                      url: (file as { base64?: string }).base64 || '#',
                      type: (file as { type?: string }).type || 'unknown',
                      size: (file as { size?: number }).size || 0,
                    }))}
                    onMoreClick={() => null}
                  />
                </div>
              );
            }

            // Array of string (enum, multi-select, etc)
            if (
              Array.isArray(value) &&
              value.length > 0 &&
              value.every((v) => typeof v === 'string')
            ) {
              return (
                <div className="flex flex-wrap gap-1">
                  {value.map((item: string) => (
                    <Badge
                      key={item}
                      variant="default"
                      className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              );
            }

            return 'default';
          })()}
        </div>
      ))}
    </div>
  );
}
