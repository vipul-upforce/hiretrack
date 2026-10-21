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
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h3 className="text-base font-semibold text-foreground">
          Update Status
        </h3>
      </div>

      <div className="space-y-3">
        <Label htmlFor="status-select" className="text-sm font-medium">
          Select New Status
        </Label>
        <div id="newStatus">
          <Select
            value={selectedStatus}
            onValueChange={(value) => setFieldValue('newStatus', value)}
            disabled={isLoadingLanes}
          >
            <SelectTrigger className="h-10">
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
                        ? 'cursor-not-allowed bg-blue-100 font-medium capitalize opacity-100 dark:bg-blue-900/50 dark:text-blue-100'
                        : 'cursor-pointer capitalize'
                    }
                  >
                    {lane} {isCurrent && '(Current)'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <FormError name="newStatus" />
      </div>

      {selectedStatus && selectedStatus !== currentStatus && (
        <div className="rounded-lg border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 text-sm shadow-sm dark:border-blue-800/60 dark:from-blue-950/40 dark:to-blue-900/20">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            Candidate status:{' '}
            <strong className="font-semibold">{currentStatus}</strong> →{' '}
            <strong className="font-semibold">{selectedStatus}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
