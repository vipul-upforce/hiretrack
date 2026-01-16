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
    <div className="group relative">
      <div
        className={`flex items-center space-x-2 whitespace-nowrap rounded-lg border px-3 py-1.5 transition-all duration-200 ${
          checked
            ? 'bg-primary/5 border-primary shadow-sm'
            : 'hover:border-primary/50 border-border bg-background hover:bg-muted/50'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onChange(!!v)}
        />
        <Label
          htmlFor={id}
          className={`cursor-pointer select-none text-sm font-medium leading-none ${checked ? 'text-primary' : 'text-foreground'} ${disabled ? 'cursor-not-allowed' : ''} `}
        >
          {label}
        </Label>
      </div>
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
    <div className="space-y-2">
      <div className="mb-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Actions
        </h3>
      </div>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
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
        {!isInterviewer && (
          <CheckboxItem
            id="updateStatus"
            label="Update Status"
            disabled={isSubmitting || actionCheckboxes.switchJob}
            checked={actionCheckboxes.updateStatus}
            onChange={(v) => onChange('updateStatus', v)}
          />
        )}
      </div>
    </div>
  );
}
