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
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h3 className="text-base font-semibold text-foreground">Follow Up</h3>
      </div>
      {!isRemoving && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followUpNote" className="text-sm font-medium">
              Note
            </Label>
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
          <div className="space-y-2.5">
            <Label htmlFor="followUpDate" className="text-sm font-medium">
              Date
            </Label>
            <DateTimePicker
              value={values.followUpDate}
              onChange={(d) => setFieldValue('followUpDate', d)}
            />
          </div>
        </div>
      )}
      {isRemoving && (
        <div className="rounded-lg border border-yellow-200/60 bg-gradient-to-br from-yellow-50 to-yellow-100/50 p-3 text-sm shadow-sm dark:border-yellow-800/60 dark:from-yellow-950/40 dark:to-yellow-900/20">
          <p className="font-medium text-yellow-900 dark:text-yellow-100">
            Warning: This will remove the existing follow-up. This action cannot
            be undone.
          </p>
        </div>
      )}
      {hasExistingFollowUp && (
        <div className="flex items-center space-x-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
          <Checkbox
            id="removeFollowUp"
            checked={values.removeFollowUp}
            onCheckedChange={(checked) =>
              setFieldValue('removeFollowUp', checked)
            }
          />
          <Label
            htmlFor="removeFollowUp"
            className="cursor-pointer text-sm font-medium"
          >
            Remove Follow-up
          </Label>
        </div>
      )}
    </div>
  );
}
