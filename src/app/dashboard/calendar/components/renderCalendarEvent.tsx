"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Video, Copy, ExternalLink } from "lucide-react";
import { CustomCalendarEvent, CandidateAssignment, Job } from "../page"; // Import types from parent

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
    <div key={index}>
      <ScrollArea className="">
        <div
          className="space-y-4 cursor-pointer"
          onClick={() => handleInterviewClick(event)}
        >
          <div>
            <h3 className="font-semibold text-lg">
              {event.extendedProps.candidate.name}
            </h3>
            <p className="text-sm text-muted-foreground capitalize">
              {typeof event.extendedProps.candidate.jobId === "string"
                ? ""
                : (event.extendedProps.candidate.jobId as Job)?.title}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Interviewer:
              </span>
              <span className="text-sm font-medium capitalize">
                {getInterviewerName(event.extendedProps.candidate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              {event.extendedProps.candidate.assignment?.time && (
                <>
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="text-sm font-medium">
                    {event.extendedProps.candidate.assignment?.time
                      ? new Date(
                          event.extendedProps.candidate.assignment.time
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Unknown"}
                  </span>
                </>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                variant="secondary"
                className="capitalize bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {event.extendedProps.candidate.status || "Unknown"}
              </Badge>
            </div>
            
            {/* Google Meet Info */}
            {event.extendedProps.candidate.assignment?.googleMeet && (
              <div className="space-y-2 border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Video size={12} className="text-blue-500" />
                    Google Meet:
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(event.extendedProps.candidate.assignment?.googleMeet?.meetingLink || '');
                      }}
                      className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                      title="Copy meeting link"
                    >
                      <Copy size={12} />
                    </button>
                    <a
                      href={event.extendedProps.candidate.assignment.googleMeet.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                      title="Open meeting link"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {event.extendedProps.candidate.assignment.googleMeet.summary}
                  </p>
                  {event.extendedProps.candidate.assignment.googleMeet.description && (
                    <p className="mt-1 text-blue-700 dark:text-blue-200 line-clamp-2">
                      {event.extendedProps.candidate.assignment.googleMeet.description.split('\n')[0]}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {typeof event.extendedProps.candidate.jobId !== "string" &&
            (event.extendedProps.candidate.jobId as Job)?.skills?.map(
              (skill: string, skillIndex: number) => (
                <Badge
                  key={`${event.extendedProps.candidate._id}-job-skill-${skillIndex}-${skill}`}
                  variant="secondary"
                  className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {skill}
                </Badge>
              )
            )}
        </div>
      </ScrollArea>
      {hasMultipleEventsToday && <hr className="my-4" />}
    </div>
  );
}
