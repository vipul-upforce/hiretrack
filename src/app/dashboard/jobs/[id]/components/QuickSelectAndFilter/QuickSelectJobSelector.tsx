'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/types/job';

interface GroupedJobs {
  open: Job[];
  draft: Job[];
  closed: Job[];
}

interface QuickSelectJobSelectorProps {
  currentJobId: string;
  groupedJobs: GroupedJobs;
  jobCandidateCounts: Record<string, number>;
  onJobSelect: (jobId: string) => void;
}

export function QuickSelectJobSelector({
  currentJobId,
  groupedJobs,
  jobCandidateCounts,
  onJobSelect,
}: QuickSelectJobSelectorProps) {
  return (
    <div className="flex-shrink-0">
      <Select value={currentJobId} onValueChange={onJobSelect}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder="Select a job" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="flex items-center justify-between px-2 py-2">
              <span className="font-semibold text-foreground">Open Jobs</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {groupedJobs.open.length}
              </Badge>
            </SelectLabel>
            {groupedJobs.open.map((job) => (
              <SelectItem key={job._id} value={job._id}>
                {job.title} ({jobCandidateCounts[job._id] ?? 0} candidates)
              </SelectItem>
            ))}
          </SelectGroup>
          {groupedJobs.open.length > 0 && groupedJobs.draft.length > 0 && (
            <SelectSeparator className="my-2" />
          )}
          <SelectGroup>
            <SelectLabel className="flex items-center justify-between px-2 py-2">
              <span className="font-semibold text-foreground">Draft Jobs</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {groupedJobs.draft.length}
              </Badge>
            </SelectLabel>
            {groupedJobs.draft.map((job) => (
              <SelectItem key={job._id} value={job._id}>
                {job.title} ({jobCandidateCounts[job._id] ?? 0} candidates)
              </SelectItem>
            ))}
          </SelectGroup>
          {groupedJobs.draft.length > 0 && groupedJobs.closed.length > 0 && (
            <SelectSeparator className="my-2" />
          )}
          <SelectGroup>
            <SelectLabel className="flex items-center justify-between px-2 py-2">
              <span className="font-semibold text-foreground">Closed Jobs</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {groupedJobs.closed.length}
              </Badge>
            </SelectLabel>
            {groupedJobs.closed.map((job) => (
              <SelectItem key={job._id} value={job._id}>
                {job.title} ({jobCandidateCounts[job._id] ?? 0} candidates)
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
