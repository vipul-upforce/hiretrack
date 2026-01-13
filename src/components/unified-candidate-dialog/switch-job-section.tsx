import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Candidate } from '@/types/candidate';
import { UnifiedFormValues } from './types';
import { FormError } from './form-errors';

interface SwitchJobSectionProps {
  candidate: Candidate;
  values: UnifiedFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  jobs: { _id: string; title: string }[] | undefined;
}

export function SwitchJobSection({
  candidate,
  values,
  setFieldValue,
  jobs,
}: SwitchJobSectionProps) {
  const currentJobId =
    typeof candidate.jobId === 'string'
      ? candidate.jobId
      : candidate.jobId?._id;
  const currentJobTitle =
    typeof candidate.jobId === 'object' ? candidate.jobId?.title : '';

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
                <SelectItem
                  key={job._id}
                  value={job._id}
                  disabled={job._id === currentJobId}
                >
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
        <FormError name="jobId" />
      </div>
      {currentJobId && values.jobId && values.jobId !== currentJobId && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          Candidate will move from <strong>{currentJobTitle}</strong> to{' '}
          <strong>{jobs?.find((j) => j._id === values.jobId)?.title}</strong>
        </div>
      )}
      {!currentJobId && values.jobId && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Candidate will be assigned to{' '}
          <strong>{jobs?.find((j) => j._id === values.jobId)?.title}</strong>
        </div>
      )}
    </div>
  );
}
