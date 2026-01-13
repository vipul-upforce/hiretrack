import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Candidate } from '@/types/candidate';
import { ActionCheckboxes, CandidateActionType } from './types';

interface ActionTogglesProps {
  candidate: Candidate;
  actionCheckboxes: ActionCheckboxes;
  onChange: (action: CandidateActionType, value: boolean) => void;
  userRole?: string;
  isSubmitting?: boolean;
}

function CheckboxItem({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(!!v)}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </Label>
    </div>
  );
}

export function ActionToggles({
  candidate,
  actionCheckboxes,
  onChange,
  userRole,
  isSubmitting,
}: ActionTogglesProps) {
  const isInterviewer = userRole === 'interviewer';

  return (
    <div className="border-b px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        {!isInterviewer && (
          <>
            <CheckboxItem
              id="assignTo"
              label="Assign To"
              checked={actionCheckboxes.assignTo}
              disabled={actionCheckboxes.markAsDone || isSubmitting}
              onChange={(v) => onChange('assignTo', v)}
            />
            <CheckboxItem
              id="switchJob"
              label="Switch Job"
              disabled={isSubmitting || actionCheckboxes.updateStatus}
              checked={actionCheckboxes.switchJob}
              onChange={(v) => onChange('switchJob', v)}
            />
          </>
        )}
        <CheckboxItem
          id="markAsDone"
          label="Mark as Done"
          checked={actionCheckboxes.markAsDone}
          disabled={!candidate.assignment || isSubmitting}
          onChange={(v) => onChange('markAsDone', v)}
        />
        {!isInterviewer && (
          <CheckboxItem
            id="addFollowUp"
            label={
              candidate?.followUp?.note || candidate?.followUp?.date
                ? 'Edit Follow Up'
                : 'Add Follow Up'
            }
            disabled={isSubmitting}
            checked={actionCheckboxes.addFollowUp}
            onChange={(v) => onChange('addFollowUp', v)}
          />
        )}
        <CheckboxItem
          id="addRemark"
          label="Add Remark"
          disabled={isSubmitting}
          checked={actionCheckboxes.addRemark}
          onChange={(v) => onChange('addRemark', v)}
        />
        <CheckboxItem
          id="updateStatus"
          label="Update Status"
          disabled={isSubmitting || actionCheckboxes.switchJob}
          checked={actionCheckboxes.updateStatus}
          onChange={(v) => onChange('updateStatus', v)}
        />
      </div>
    </div>
  );
}
