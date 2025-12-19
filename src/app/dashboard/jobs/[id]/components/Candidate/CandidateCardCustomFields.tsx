/**
 * Candidate Card Custom Fields Component
 * Displays custom fields that are configured to show on card
 */

import { Candidate } from '@/types/candidate';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
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
        <div key={key} className="text-sm">
          <span className="truncate text-gray-600 dark:text-gray-400">
            {key.split(' |||||(')[0]}:
          </span>
          {(() => {
            if (typeof value === 'string') {
              return (
                <span className="font-semibold text-orange-700 dark:text-orange-400">
                  {value}
                </span>
              );
            }

            if (Array.isArray(value) && value.length > 0) {
              return (
                <AttachmentsPopover
                  attachments={value.map((file, index) => {
                    if (typeof file === 'string') {
                      return {
                        id: '',
                        name: '',
                        url: '',
                        type: '',
                        size: 0,
                      };
                    }
                    return {
                      id: `${key}-${index}-${file.name}`,
                      name: file.name,
                      url: (file as { base64?: string }).base64 || '#',
                      type: file.type || 'unknown',
                      size: file.size || 0,
                    };
                  })}
                  onMoreClick={() => null}
                />
              );
            }

            return 'default';
          })()}
        </div>
      ))}
    </div>
  );
}
