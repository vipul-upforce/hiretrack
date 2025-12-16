'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Video, Copy, ExternalLink } from 'lucide-react';
import { getRandom } from '@/lib/utils/getRandom';
import { CustomCalendarEvent, CandidateAssignment, Job } from '../types'; // Import types from parent

interface EventDetailsProps {
  event: CustomCalendarEvent;
  events: CustomCalendarEvent[];
  getInterviewerName: (candidate: CandidateAssignment) => string;
  index: number;
  handleInterviewClick: (event: CustomCalendarEvent) => void;
}

export function RenderEvent({
  event,
  events,
  getInterviewerName,
  index,
  handleInterviewClick,
}: EventDetailsProps) {
  // const today = new Date().toISOString().split("T")[0];
  const hasMultipleEventsToday = events.length > 1;

  return (
    <>
      {getInterviewerName(event.extendedProps.candidate) && (
        <div key={index}>
          <ScrollArea className="">
            <button
              type="button"
              className="cursor-pointer space-y-4"
              onClick={() => handleInterviewClick(event)}
            >
              <div>
                <h3 className="text-lg font-semibold">
                  {event.extendedProps.candidate.name}
                </h3>
                {typeof event.extendedProps.candidate.jobId !== 'string' &&
                  (event.extendedProps.candidate.jobId as Job)?.title && (
                    <p className="text-sm capitalize text-muted-foreground">
                      {(event.extendedProps.candidate.jobId as Job).title}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                {getInterviewerName(event.extendedProps.candidate) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Interviewer:
                    </span>
                    <span className="text-sm font-medium capitalize">
                      {getInterviewerName(event.extendedProps.candidate)}
                    </span>
                  </div>
                )}
                {event.extendedProps.candidate.assignment?.time && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(
                        event.extendedProps.candidate.assignment.time,
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {event.extendedProps.candidate.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status:
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 capitalize text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {event.extendedProps.candidate.status}
                    </Badge>
                  </div>
                )}

                {/* Google Meet Info */}
                {event.extendedProps.candidate.assignment?.googleMeet && (
                  <div className="space-y-2 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Video size={12} className="text-blue-500" />
                        Google Meet:
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              event.extendedProps.candidate.assignment
                                ?.googleMeet?.meetingLink || '',
                            );
                          }}
                          className="p-1 text-blue-500 transition-colors hover:text-blue-600"
                          title="Copy meeting link"
                        >
                          <Copy size={12} />
                        </button>
                        {event.extendedProps.candidate.assignment.googleMeet
                          .meetingLink && (
                          <a
                            href={
                              event.extendedProps.candidate.assignment
                                .googleMeet.meetingLink
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-blue-500 transition-colors hover:text-blue-600"
                            title="Open meeting link"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="rounded bg-blue-50 p-2 text-xs text-muted-foreground dark:bg-blue-900/20">
                      {event.extendedProps.candidate.assignment.googleMeet
                        .summary && (
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {
                            event.extendedProps.candidate.assignment.googleMeet
                              .summary
                          }
                        </p>
                      )}
                      {event.extendedProps.candidate.assignment.googleMeet
                        .description && (
                        <p className="mt-1 line-clamp-2 text-blue-700 dark:text-blue-200">
                          {
                            event.extendedProps.candidate.assignment.googleMeet.description.split(
                              '\n',
                            )[0]
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {typeof event.extendedProps.candidate.jobId !== 'string' &&
                ((event.extendedProps.candidate.jobId as Job)?.skills || [])
                  .length > 0 && (
                  <div>
                    {(
                      (event.extendedProps.candidate.jobId as Job)?.skills || []
                    ).map((skill: string, _: number) => (
                      <Badge
                        key={`${event.extendedProps.candidate._id}-job-skill-${getRandom(0, 1000000).toString()}-${skill}`}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
            </button>
          </ScrollArea>
          {hasMultipleEventsToday && <hr className="my-4" />}
        </div>
      )}
      <span />
    </>
  );
}
