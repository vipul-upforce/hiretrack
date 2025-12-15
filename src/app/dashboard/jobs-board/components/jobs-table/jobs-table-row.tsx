import { Job } from '@/types/job';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { User } from '@/lib/features/org/orgApi';
import { formatReadableDate } from '@/lib/formate-redable-date';
import { CustomFieldDef } from './types';
import { JobActionsCell } from './jobs-actions-cell';

interface JobsTableRowProps {
  job: Job;
  user: User;
  visibleColumns: Set<string>;
  customFields: CustomFieldDef[];
  actions: {
    setSelectedJob: (job: Job) => void;
    setIsDetailsOpen: (open: boolean) => void;
    setIsEditMode: (editMode: boolean) => void;
    handleDeleteClick: (jobId: string) => void;
    handleDuplicateClick: (job: Job) => void;
    handleAnalyticsClick: (job: Job) => void;
    onEmailSettingsClick?: (job: Job) => void;
  };
}

export function JobsTableRow({
  job,
  user,
  visibleColumns,
  customFields,
  actions,
}: JobsTableRowProps) {
  const router = useRouter();

  return (
    <TableRow
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
      onClick={() => router.push(`/dashboard/jobs/${job._id}`)}
    >
      {/* Title */}
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {!job.isPublished && job.status === 'open' && (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Candidates cannot apply until this job is published.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {job.title.length > 40
                      ? `${job.title.slice(0, 40)}...`
                      : job.title}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{job.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {job.experience !== undefined && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {job.experience}
              {' '}
              {job.experience === 1 ? 'year' : 'years'}
              {' '}
              exp
              required
            </span>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="py-4">
        <Badge
          variant={
            job.status === 'open'
              ? 'default'
              : job.status === 'closed'
                ? 'secondary'
                : 'outline'
          }
        >
          {job.status}
        </Badge>
      </TableCell>

      {/* Applications */}
      {visibleColumns.has('applications') && (
        <TableCell className="py-4">
          <span className="text-gray-900 dark:text-gray-100 font-medium">
            {job.candidateCount || 0}
          </span>
        </TableCell>
      )}

      {/* Experience */}
      {visibleColumns.has('experience') && (
        <TableCell className="py-4">
          <span className="text-gray-600 dark:text-gray-400">
            {job.experience || job.experience === 0
              ? `${job.experience} years`
              : '-'}
          </span>
        </TableCell>
      )}

      {/* Skills */}
      {visibleColumns.has('skills') && (
        <TableCell className="py-4">
          <div className="flex flex-wrap gap-1">
            {job.skills && job.skills.length > 0 ? (
              <>
                {job.skills.slice(0, 2).map((skill, index) => (
                  <Badge
                    key={`${job._id}-skill-${index}`}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {skill}
                  </Badge>
                ))}
                {job.skills.length > 2 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    +
                    {job.skills.length - 2}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </TableCell>
      )}

      {/* Custom Fields */}
      {customFields.map((field) => {
        if (!visibleColumns.has(field.label)) return null;
        const value = job.customFields?.[field.label];
        return (
          <TableCell key={field.label} className="py-4">
            {value && typeof value === 'string' ? (
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {value}
              </span>
            ) : Array.isArray(value) && value.length > 0 ? (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {value.length}
                {' '}
                files
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </TableCell>
        );
      })}

      {/* Created */}
      <TableCell className="py-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatReadableDate(job.tracking?.createdAt, 'relative')}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-4">
        <JobActionsCell
          job={job}
          user={user}
          onSetSelectedJob={actions.setSelectedJob}
          onEdit={() => {
            actions.setIsDetailsOpen(true);
            actions.setIsEditMode(true);
          }}
          onDuplicate={actions.handleDuplicateClick}
          onAnalytics={actions.handleAnalyticsClick}
          onDelete={actions.handleDeleteClick}
          onDetails={() => actions.setIsDetailsOpen(true)}
          onEmailSettings={actions.onEmailSettingsClick}
        />
      </TableCell>
    </TableRow>
  );
}
