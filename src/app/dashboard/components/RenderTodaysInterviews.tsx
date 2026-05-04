import { Card, CardContent } from '@/components/ui/card';
import { Candidate, CandidateStatus } from '@/types/candidate';
import { BriefcaseIcon, CalendarIcon, ClockIcon, Zap, InboxIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CandidateStatusBadge } from '../jobs/[id]/components/Utils/candidate-status-badge';
import { formatDate, formatTime } from '../jobs/[id]/hooks/dateTimeFormatting';

export function RenderTodaysInterviews({
  todayAssignments,
  onCandidateClick,
}: {
  todayAssignments: Candidate[];
  onCandidateClick: (candidate: Candidate) => void;
}) {

  if (!todayAssignments || todayAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-16 text-center text-muted-foreground transition-colors hover:bg-muted/20">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <InboxIcon className="h-8 w-8 opacity-60" />
        </div>
        <p className="text-xl font-semibold tracking-tight text-foreground">No interviews today</p>
        <p className="mt-2 max-w-sm text-sm">You currently have no candidates scheduled for interviews today.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-6">
      {todayAssignments.map((assignment, index) => (
        <Card
          key={assignment.id || assignment._id || `assignment-${index}`}
          role="button"
          tabIndex={0}
          className="group relative flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-border/50 bg-background min-w-[320px] max-w-[480px] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)]"
          onClick={() => onCandidateClick(assignment)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onCandidateClick(assignment);
            }
          }}
        >
          {/* Header Layout */}
          <div className="flex flex-row items-start justify-between border-b border-border/40 bg-muted/10 p-5">
            <div className="flex min-w-0 flex-col gap-1.5 pr-4">
              <h3 className="truncate text-lg font-semibold tracking-tight text-foreground capitalize transition-colors duration-200 group-hover:text-primary" title={assignment.name}>
                {assignment.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BriefcaseIcon className="h-4 w-4 shrink-0 text-primary/60" />
                <span className="truncate font-medium" title={assignment?.jobId?.title}>
                  {assignment?.jobId?.title || 'No Position Specified'}
                </span>
              </div>
            </div>
            <div className="shrink-0 pt-0.5">
              <CandidateStatusBadge status={assignment.status as CandidateStatus} />
            </div>
          </div>

          <CardContent className="flex flex-1 flex-col p-5">

            <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border/40 bg-muted/20 p-4 transition-colors group-hover:bg-muted/30 sm:flex-row sm:items-center">

              {/* Date Box */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {assignment?.assignment?.time
                      ? formatDate(assignment.assignment.time.toLocaleString())
                      : 'Not Scheduled'}
                  </span>
                </div>
              </div>

              <div className="hidden h-10 w-px bg-border/60 sm:block" />

              {/* Time Box */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time</span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {assignment?.assignment?.time
                      ? formatTime(assignment.assignment.time.toLocaleString())
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            {(assignment.skills?.length ?? 0) > 0 && (
              <div className="mt-auto flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Required Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignment.skills.slice(0, 4).map((skill) => (
                    <Badge
                      key={`${assignment.id}-skill-${skill.toString()}`}
                      variant="secondary"
                      className="max-w-[140px] truncate bg-secondary/60 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary"
                      title={skill.toString()}
                    >
                      {skill.toString()}
                    </Badge>
                  ))}
                  {assignment.skills.length > 4 && (
                    <Badge variant="outline" className="border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      +{assignment.skills.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      ))}
    </div>
  );
}