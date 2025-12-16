import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CandidateStatus } from '@/types/candidate';
import { BriefcaseIcon, CalendarIcon, ClockIcon, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useCustomForm from '@/Custom_Fields/hooks/useCustomForm';
import { getRandom } from '@/lib/utils/getRandom';
import { CandidateStatusBadge } from '../jobs/[id]/components/Utils/candidate-status-badge';
import { Assignment } from '../page';
import { formatDate, formatTime } from '../jobs/[id]/hooks/dateTimeFormatting';
import CustomFieldBadge from '../jobs/[id]/components/Candidate/CustomFieldBadge';

export function RenderInterviewerAssignments({
  interviewerAssignments,
}: {
  interviewerAssignments: Assignment[];
}) {
  const { formNameObject } = useCustomForm('Candidate');

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {interviewerAssignments?.map((assignment) => (
        <Card key={assignment.id || Math.random().toString()}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg capitalize">
              <div className="flex w-full flex-row items-center justify-between pb-2">
                <p className="w-[70%] break-words">{assignment.name}</p>
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
                        key={`${assignment.id}-skill-${getRandom(0, 1000000).toString()}-${skill}`}
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
                      {assignment?.assignment?.time
                        ? formatDate(
                            assignment?.assignment?.time.toLocaleString(),
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
                      {assignment?.assignment?.time
                        ? formatTime(
                            assignment?.assignment?.time.toLocaleString(),
                          )
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {assignment.customFields &&
                  Object.entries(assignment.customFields)
                    .filter(([key, value]) => {
                      const field = formNameObject?.fields.find(
                        (f) => f.label === key,
                      );
                      if (
                        field?.candidateId &&
                        field.candidateId !== assignment._id
                      )
                        return false;
                      if (
                        (typeof value === 'string' && value === '') ||
                        (typeof value === 'object' &&
                          Object.keys(value).length === 0)
                      ) {
                        return false;
                      }
                      return field?.showOnCard;
                    })
                    .map(([key, value]) => (
                      <div key={getRandom(0, 1000000).toString()}>
                        <CustomFieldBadge kii={key} value={value} />
                      </div>
                    ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
