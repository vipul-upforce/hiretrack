"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CustomCalendarEvent, CandidateAssignment, Job } from "../page"; // Import types from parent

interface EventDetailsProps {
  event: CustomCalendarEvent;
  events: CustomCalendarEvent[];
  getInterviewerName: (candidate: CandidateAssignment) => string;
  index: number;
}

export function RenderEvent({
  event,
  events,
  getInterviewerName,
  index,
}: EventDetailsProps) {
  const today = new Date().toISOString().split("T")[0];
  const hasMultipleEventsToday =
    events.filter((e) => e?.start?.toISOString().split("T")[0] === today)
      .length > 1;

  return (
    <div key={index}>
      <ScrollArea className="">
        <div className="space-y-4">
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
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge className="capitalize">
                {event.extendedProps.candidate.status || "Unknown"}
              </Badge>
            </div>
          </div>

          {typeof event.extendedProps.candidate.jobId !== "string" &&
            (event.extendedProps.candidate.jobId as Job)?.skills?.map(
              (skill: string) => (
                <Badge key={skill} variant="secondary">
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
