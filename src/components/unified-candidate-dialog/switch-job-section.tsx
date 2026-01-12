import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnifiedFormValues } from './types';

interface SwitchJobSectionProps {
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  jobs: { _id: string; title: string }[] | undefined;
}

export function SwitchJobSection({
  values,
  setFieldValue,
  jobs,
}: SwitchJobSectionProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Switch Job</h3>
      <div className="grid gap-2">
        <Label htmlFor="jobId">Select Job</Label>
        <Select
          value={values.jobId}
          onValueChange={(v) => setFieldValue('jobId', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Job" />
          </SelectTrigger>
          <SelectContent>
            {jobs?.length ? (
              jobs.map((job) => (
                <SelectItem key={job._id} value={job._id}>
                  {job.title}
                </SelectItem>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No open jobs available
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
