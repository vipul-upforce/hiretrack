import React from 'react';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { Candidate } from '@/types/candidate';
import { UnifiedFormValues } from './types';
import { FormError } from './form-errors';
import { MentionTextarea } from '../ui/mention-textarea';

interface FollowUpSectionProps {
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  userRole?: string;
  candidate: Candidate;
}

export function FollowUpSection({
  values,
  setFieldValue,
  userRole,
  candidate,
}: FollowUpSectionProps) {
  const isRemoving = values.removeFollowUp;
  const hasExistingFollowUp =
    candidate?.followUp?.note || candidate?.followUp?.date;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Follow Up</h3>
      {!isRemoving && (
        <>
          <div className="space-y-2">
            <Label htmlFor="followUpNote">Note</Label>
            <MentionTextarea
              placeholder="Add the note... (Alt+Enter to submit)"
              className="max-h-80 overflow-y-auto"
              value={values.followUpNote}
              onChange={(v) => setFieldValue('followUpNote', v)}
              organizationId=""
              currentUserRole={userRole || ''}
              rows={4}
              disableMentions
            />
            <FormError name="followUpNote" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Date</Label>
            <DateTimePicker
              value={values.followUpDate}
              onChange={(d) => setFieldValue('followUpDate', d)}
            />
          </div>
        </>
      )}
      {isRemoving && (
        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Warning: This will remove the existing follow-up. This action cannot
          be undone.
        </div>
      )}
      {hasExistingFollowUp && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="removeFollowUp"
            checked={values.removeFollowUp}
            onCheckedChange={(checked) =>
              setFieldValue('removeFollowUp', checked)
            }
          />
          <Label htmlFor="removeFollowUp" className="text-sm font-medium">
            Remove Follow-up
          </Label>
        </div>
      )}
    </div>
  );
}
