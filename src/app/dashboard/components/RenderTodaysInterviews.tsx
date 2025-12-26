import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Candidate, CandidateStatus } from '@/types/candidate';
import { BriefcaseIcon, CalendarIcon, ClockIcon, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// import { Assignment } from '@/types/assignment';
import { CandidateStatusBadge } from '../jobs/[id]/components/Utils/candidate-status-badge';
import { formatDate, formatTime } from '../jobs/[id]/hooks/dateTimeFormatting';

export function RenderTodaysInterviews({
  todayAssignments,
}: {
  todayAssignments: Candidate[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {todayAssignments?.map((assignment) => (
        <Card key={assignment.id || Math.random().toString()}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg capitalize">
              <div className="flex flex-row items-center justify-between pb-2">
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
                <BriefcaseIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">
                    {assignment?.jobId?.title || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="mb-1.5 text-sm text-muted-foreground">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assignment.skills.slice(0, 3).map((skill) => (
                      <Badge
                        key={`${assignment.id}-skill-${skill}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {assignment.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{assignment.skills.length - 3}
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
                      {assignment.assignment?.time
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
                      {assignment.assignment?.time
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
