'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Rating } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import {
  useFetchJobLanesQuery,
  useFetchJobsQuery,
} from '@/lib/features/job/jobApi';

export type BatchOperations = {
  assignJob: boolean;
  jobId: string;
  updateStatus: boolean;
  status: string;
  addRemark: boolean;
  remark: string;
  isRemarkPrivate: boolean;
  remarkRating: number | null;
};

interface BatchOperationsProps {
  value: BatchOperations;
  onChange: (next: BatchOperations) => void;
  disabled?: boolean;
  organizationId?: string;
  userRole?: string;
  variant?: 'all' | 'toggles' | 'sections';
}

function TogglePill({
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
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="group relative">
      <div
        className={`flex items-center space-x-2 whitespace-nowrap rounded-lg border px-3 py-1.5 transition-all duration-200 ${
          checked
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onChange(!!v)}
        />
        <Label
          htmlFor={id}
          className={`cursor-pointer select-none text-sm font-medium leading-none ${
            checked ? 'text-primary' : 'text-foreground'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          {label}
        </Label>
      </div>
    </div>
  );
}

export function BatchOperationsPanel({
  value,
  onChange,
  disabled = false,
  organizationId,
  userRole,
  variant = 'all',
}: BatchOperationsProps) {
  const showToggles = variant !== 'sections';
  const showSections = variant !== 'toggles';
  const { data: jobs = [], isFetching: isJobsLoading } =
    useFetchJobsQuery(undefined, {
      skip: !value.assignJob,
    });

  const { data: lanesData, isFetching: isLanesLoading } =
    useFetchJobLanesQuery(value.jobId, {
      skip: !value.assignJob || !value.jobId,
    });

  const lanes = useMemo(() => lanesData?.lanes || [], [lanesData?.lanes]);

  const update = (patch: Partial<BatchOperations>) => {
    onChange({ ...value, ...patch });
  };

  const handleAssignToggle = (checked: boolean) => {
    if (!checked) {
      update({
        assignJob: false,
        jobId: '',
        updateStatus: false,
        status: '',
      });
      return;
    }
    update({ assignJob: true });
  };

  const handleUpdateStatusToggle = (checked: boolean) => {
    if (!checked) {
      update({ updateStatus: false, status: '' });
      return;
    }
    update({ updateStatus: true });
  };

  const handleRemarkToggle = (checked: boolean) => {
    if (!checked) {
      update({
        addRemark: false,
        remark: '',
        isRemarkPrivate: true,
        remarkRating: null,
      });
      return;
    }
    update({ addRemark: true });
  };

  return (
    <div className="space-y-4">
      {showToggles && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select Actions
          </h3>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <TogglePill
              id="assign-job"
              label="Assign Job"
              checked={value.assignJob}
              disabled={disabled}
              onChange={handleAssignToggle}
            />
            <TogglePill
              id="update-status"
              label="Update Status"
              checked={value.updateStatus}
              disabled={disabled || !value.assignJob}
              onChange={handleUpdateStatusToggle}
            />
            <TogglePill
              id="add-remark"
              label="Add Remark"
              checked={value.addRemark}
              disabled={disabled}
              onChange={handleRemarkToggle}
            />
          </div>
        </div>
      )}

      {showSections &&
        !value.assignJob &&
        !value.updateStatus &&
        !value.addRemark && (
          <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed bg-muted/10 px-6 text-sm text-muted-foreground">
            Choose an action above to configure batch settings.
          </div>
        )}

      {showSections && value.assignJob && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Assign Job
            </h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-select" className="text-sm font-medium">
              Select Job
            </Label>
            <Select
              value={value.jobId}
              onValueChange={(jobId) => update({ jobId, status: '' })}
              disabled={disabled || isJobsLoading}
            >
              <SelectTrigger id="job-select" className="h-10">
                <SelectValue
                  placeholder={isJobsLoading ? 'Loading jobs...' : 'Select job'}
                />
              </SelectTrigger>
              <SelectContent>
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No jobs available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showSections && value.updateStatus && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Update Status
            </h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-select" className="text-sm font-medium">
              Select Status
            </Label>
            <Select
              value={value.status}
              onValueChange={(status) => update({ status })}
              disabled={disabled || !value.jobId || isLanesLoading}
            >
              <SelectTrigger id="status-select" className="h-10">
                <SelectValue
                  placeholder={
                    isLanesLoading ? 'Loading lanes...' : 'Select status'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {lanes.map((lane) => (
                  <SelectItem key={lane} value={lane}>
                    {lane}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!value.status && (
              <p className="text-xs text-muted-foreground">
                If no status is selected, candidates will default to Applied.
              </p>
            )}
          </div>
        </div>
      )}

      {showSections && value.addRemark && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h3 className="text-base font-semibold text-foreground">Remark</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="remark-text" className="text-sm font-medium">
              Description
            </Label>
            <div id="remark-text">
              <MentionTextarea
                placeholder="Add a remark... (Alt+Enter to submit)"
                className="max-h-80 overflow-y-auto"
                value={value.remark}
                onChange={(text) => update({ remark: text })}
                organizationId={organizationId || ''}
                currentUserRole={userRole || ''}
                rows={4}
                isRemarkPrivate={value.isRemarkPrivate}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Label
                htmlFor="remarkRating"
                className="text-sm font-medium text-muted-foreground"
              >
                Rating:
              </Label>
              <Rating
                name="remark-rating"
                value={value.remarkRating}
                onChange={(_e, v) => update({ remarkRating: v ?? null })}
                precision={0.5}
                sx={{
                  '& .MuiRating-iconEmpty': { color: 'rgb(156 163 175)' },
                  '& .MuiRating-iconFilled': { color: '#fbbf24' },
                  '& .MuiRating-iconHover': { color: '#f59e0b' },
                }}
              />
            </div>
            {userRole !== 'interviewer' && (
              <div className="flex items-center space-x-3">
                {value.isRemarkPrivate ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <Label
                  htmlFor="privacy-toggle"
                  className="cursor-pointer text-sm font-medium"
                >
                  {value.isRemarkPrivate ? 'Private' : 'Public'}
                </Label>
                <Switch
                  id="privacy-toggle"
                  checked={value.isRemarkPrivate}
                  onCheckedChange={(checked) =>
                    update({ isRemarkPrivate: !!checked })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showSections && value.assignJob && !value.updateStatus && value.jobId && (
        <p className="text-xs text-muted-foreground">
          Status will default to Applied unless you enable Update Status.
        </p>
      )}
    </div>
  );
}
