import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Candidate } from '@/types/candidate';
import { UnifiedFormValues } from './types';
import { FormError } from './form-errors';

interface StatusUpdateSectionProps {
  candidate: Candidate;
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  lanes: string[];
  isLoadingLanes: boolean;
}

export function StatusUpdateSection({
  candidate,
  values,
  setFieldValue,
  lanes,
  isLoadingLanes,
}: StatusUpdateSectionProps) {
  const currentStatus = candidate.status;
  const selectedStatus = values.newStatus || '';

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Update Status</h3>

      <div className="space-y-2">
        <Label htmlFor="status-select">Select New Status</Label>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setFieldValue('newStatus', value)}
          disabled={isLoadingLanes}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                isLoadingLanes ? 'Loading lanes...' : 'Select status'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {lanes.map((lane) => {
              const isCurrent = lane === currentStatus;

              return (
                <SelectItem
                  key={lane}
                  value={lane}
                  disabled={isCurrent}
                  className={
                    isCurrent
                      ? 'cursor-not-allowed bg-blue-100 font-medium opacity-100 dark:bg-blue-900/50 dark:text-blue-100'
                      : 'cursor-pointer'
                  }
                >
                  {lane} {isCurrent && '(Current)'}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <FormError name="newStatus" />
      </div>

      {selectedStatus && selectedStatus !== currentStatus && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          Candidate status: {currentStatus} → {selectedStatus}
        </div>
      )}
    </div>
  );
}
