import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { CandidateStatus } from '@/types/candidate';
import {
  BriefcaseIcon, CalendarIcon, ClockIcon, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Assignment } from '../page';
import { CandidateStatusBadge } from '../jobs/[id]/components/Utils/candidate-status-badge';
import { formatDate, formatTime } from '../jobs/[id]/hooks/dateTimeFormatting';

export function RenderTodaysInterviews({
  todayAssignments,
}: {
  todayAssignments: Assignment[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {todayAssignments?.map((assignment) => (
        <Card key={assignment.id || Math.random().toString()}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg capitalize">
              <div className="flex pb-2 flex-row items-center justify-between">
                <p>{assignment.name}</p>
                <div>
                  <CandidateStatusBadge
                    status={assignment.status as CandidateStatus}
                  />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Position */}
              <div className="flex items-start gap-2">
                <BriefcaseIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">
                    {assignment?.jobId?.title || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex items-start gap-2">
                <Zap className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assignment.skills.slice(0, 3).map((skill, skillIndex) => (
                      <Badge
                        key={`${assignment.id}-skill-${skillIndex}-${skill}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {assignment.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +
                        {assignment.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">
                      {assignment.assignment.time
                        ? formatDate(
                          assignment.assignment.time.toLocaleString(),
                        )
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium">
                      {assignment.assignment.time
                        ? formatTime(
                          assignment.assignment.time.toLocaleString(),
                        )
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
