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
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h3 className="text-base font-semibold text-foreground">Switch Job</h3>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="jobId" className="text-sm font-medium">
          Select Job
        </Label>
        <Select
          value={values.jobId}
          onValueChange={(v) => setFieldValue('jobId', v)}
        >
          <SelectTrigger className="h-10">
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
        <div className="rounded-lg border border-blue-200/60 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 text-sm shadow-sm dark:border-blue-800/60 dark:from-blue-950/40 dark:to-blue-900/20">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            Candidate will move from{' '}
            <strong className="font-semibold">{currentJobTitle}</strong> to{' '}
            <strong className="font-semibold">
              {jobs?.find((j) => j._id === values.jobId)?.title}
            </strong>
          </p>
        </div>
      )}
      {!currentJobId && values.jobId && (
        <div className="rounded-lg border border-green-200/60 bg-gradient-to-br from-green-50 to-green-100/50 p-3 text-sm shadow-sm dark:border-green-800/60 dark:from-green-950/40 dark:to-green-900/20">
          <p className="font-medium text-green-900 dark:text-green-100">
            Candidate will be assigned to{' '}
            <strong className="font-semibold">
              {jobs?.find((j) => j._id === values.jobId)?.title}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
