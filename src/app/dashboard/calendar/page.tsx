"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetchAssignedCandidatesQuery } from "@/lib/features/candidate/candidateApi";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { EventClickArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import {
  CandidateDetailsDialog,
  formatTime,
} from "../jobs/[id]/components/candidate-details-dialog";
import { CandidateStatus } from "@/types/candidate";
import { Assignment } from "@/types/assignment";
import LoaderSkeletonCalender from "./components/loader-skeleton-calender";

interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

interface Job {
  _id: string;
  title: string;
  description: string;
  skills?: string[];
}

interface CandidateAssignment {
  _id: string;
  name: string;
  jobId: Job | string;
  jobDetails?: {
    title: string;
    description: string;
  };
  location: string;
  experience: number;
  skills: string[];
  expectedCTC?: number;
  currentCTC?: number;
  noticePeriod: number;
  // currentLocation: string;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  } | null;
  assignment: Assignment | null;
  remarks?: Array<{
    description: string;
    date: string;
    rating?: number;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
  }>;
  status?: CandidateStatus;
  tracking?: {
    createdAt: string;
    updatedAt: string;
  };
}

interface CustomCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  startStr: string;
  endStr: string;
  url: string;
  display: string;
  extendedProps: {
    candidate: CandidateAssignment;
    interviewer: Interviewer;
  };
}

export default function CalendarPage() {
  const {
    data: assignments,
    isLoading,
    refetch,
  } = useFetchAssignedCandidatesQuery();
  const [selectedEvent, setSelectedEvent] =
    useState<CustomCalendarEvent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if(!isDetailsOpen){
      setSelectedEvent(null)
    }
  }, [isDetailsOpen])

  const events =
    assignments?.map((candidate) => ({
      id: candidate._id,
      title: candidate?.jobId?.title,
      start: candidate?.assignment?.deadline
        ? new Date(candidate.assignment.deadline)
        : new Date(),
      end: candidate?.assignment?.deadline
        ? new Date(candidate.assignment.deadline)
        : new Date(),
      extendedProps: {
        candidate: {
          ...candidate,
          jobId:
            typeof candidate.jobId === "string"
              ? candidate.jobId
              : (candidate.jobId as unknown as Job)?._id,
          jobDetails:
            typeof candidate.jobId === "string"
              ? undefined
              : {
                  title: (candidate.jobId as Job).title,
                  description: (candidate.jobId as Job).description,
                },
        },
        interviewer:
          typeof candidate.assignment?.interviewerId === "string"
            ? {
                _id: candidate.assignment.interviewerId,
                name: "Unknown",
                email: "Unknown",
              }
            : candidate.assignment?.interviewerId || {
                _id: "",
                name: "Unknown",
                email: "Unknown",
              },
      },
    })) || [];

  const handleEventClick = (arg: EventClickArg) => {
    const event = arg.event;
    if (event.extendedProps?.candidate && event.extendedProps?.interviewer) {
      const calendarEvent = event as unknown as CustomCalendarEvent;
      setSelectedEvent(calendarEvent);
      setIsDetailsOpen(true);
    }
  };

  const handleDateClick = (arg: DateClickArg) => {
    const eventsOnDate = events.filter(
      (event) => event.start.toISOString().split("T")[0] === arg.dateStr
    );

    if (eventsOnDate.length === 1) {
      const eventDate = new Date(eventsOnDate[0].start);
      const event: CustomCalendarEvent = {
        id: eventsOnDate[0].id,
        title: eventsOnDate[0].title,
        start: eventDate,
        end: eventDate,
        allDay: true,
        startStr: eventDate.toISOString(),
        endStr: eventDate.toISOString(),
        url: "",
        display: "auto",
        extendedProps: {
          candidate: {
            ...eventsOnDate[0].extendedProps.candidate,
            assignment: eventsOnDate[0].extendedProps.candidate.assignment || {
              interviewerId: "",
              deadline: "",
              assignedAt: new Date().toISOString(),
              status: "",
            },
            tracking: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          interviewer: eventsOnDate[0].extendedProps.interviewer,
        },
      };

      setSelectedEvent(event);
      setIsDetailsOpen(true);
    }
  };

  const getInterviewerName = (candidate: CandidateAssignment) => {
    if (candidate?.assignment?.interviewerId) {
      return typeof candidate.assignment.interviewerId === "object"
        ? candidate.assignment.interviewerId.name
        : "Unknown";
    }
    return "Unknown";
  };

  if (isLoading) {
    return <LoaderSkeletonCalender />;
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Interview Calendar</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 flex-1 min-h-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              events={events}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              customButtons={{
                today: {
                  text: "Today",
                  click: () => {
                    calendarRef.current?.getApi().today();
                  },
                },
              }}
              height="100%"
              contentHeight="100%"
              handleWindowResize={true}
              eventTextColor="var(--primary-foreground)"
              eventContent={(arg) => {
                return (
                  <div
                    id="assignment-event"
                    className="bg-white px-2 w-full rounded-xl border-[1px] border-solid border-gray-300  py-2 px-2 shadow-md transition hover:shadow-xl overflow-x-clip cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-black capitalize">
                        {arg.event.title}
                      </p>
                      <p className="text-sm text-gray-500 font-thin relative">
                        {arg.event.start ? formatTime(arg.event.start) : ""}
                      </p>
                    </div>
                    <div className="flex flex-row justify-between items-center">
                      <p className="text-sm  text-black capitalize">
                        {arg.event._def.extendedProps.interviewer.name}
                      </p>
                      <p className="text-sm text-gray-500 font-thin">(I)</p>
                    </div>
                    <hr className="my-1" />
                    <div className="flex flex-row justify-between items-center">
                      <p className="text-sm  text-black text-wrap capitalize">
                        {arg.event._def.extendedProps.candidate.name}
                      </p>
                      <p className="text-sm text-gray-500 font-thin">(C)</p>
                    </div>
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-[calc(100vh-140px)] overflow-auto sticky top-6">
          <CardHeader>
            <CardTitle>Today&apos;s Interview</CardTitle>
          </CardHeader>
          <CardContent>
            {events
              .filter(
                (event) =>
                  new Date(event.start).toLocaleDateString() ===
                  new Date().toLocaleDateString()
              )

              .map((event, i) => (
                <div key={i}>
                  <ScrollArea className="">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {event.extendedProps.candidate.name}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {typeof event.extendedProps.candidate.jobId ===
                          "string"
                            ? ""
                            : (event.extendedProps.candidate.jobId as Job)
                                ?.title}
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
                          <span className="text-sm text-muted-foreground">
                            Date:
                          </span>
                          <span className="text-sm font-medium">
                            {event.extendedProps.candidate.assignment?.deadline
                              ? new Date(
                                  event.extendedProps.candidate.assignment.deadline
                                )
                                  .toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                  .replace(/(\d+)(?=th|st|nd|rd)/, "$1") +
                                (new Date(
                                  event.extendedProps.candidate.assignment.deadline
                                ).getDate() %
                                  10 ===
                                  1 &&
                                new Date(
                                  event.extendedProps.candidate.assignment.deadline
                                ).getDate() !== 11
                                  ? "st"
                                  : new Date(
                                      event.extendedProps.candidate.assignment.deadline
                                    ).getDate() %
                                      10 ===
                                      2 &&
                                    new Date(
                                      event.extendedProps.candidate.assignment.deadline
                                    ).getDate() !== 12
                                  ? "nd"
                                  : new Date(
                                      event.extendedProps.candidate.assignment.deadline
                                    ).getDate() %
                                      10 ===
                                      3 &&
                                    new Date(
                                      event.extendedProps.candidate.assignment.deadline
                                    ).getDate() !== 13
                                  ? "rd"
                                  : "")
                              : "Unknown"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Status:
                          </span>
                          <Badge className="capitalize">
                            {event.extendedProps.candidate.status || "Unknown"}
                          </Badge>
                        </div>
                      </div>

                      {typeof event.extendedProps.candidate.jobId !==
                        "string" &&
                        (
                          event.extendedProps.candidate.jobId as Job
                        )?.skills?.map((skill: string) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                    </div>
                  </ScrollArea>
                  {events.filter(
                    (event) =>
                      event.start.toISOString().split("T")[0] ===
                      new Date().toISOString().split("T")[0]
                  ).length > 1 && <hr className="my-4" />}
                </div>
              ))}
            <div className="text-center text-muted-foreground py-8">
              {events.filter(
                (event) =>
                  event.start.toISOString().split("T")[0] ===
                  new Date().toISOString().split("T")[0]
              ).length > 0
                ? ""
                : "No interviews scheduled for today"}
            </div>
          </CardContent>
        </Card>
      </div>
      {selectedEvent && (
        <CandidateDetailsDialog
          candidate={{
            ...selectedEvent.extendedProps.candidate,
            jobId: {
              _id:
                typeof selectedEvent.extendedProps.candidate.jobId === "string"
                  ? selectedEvent.extendedProps.candidate.jobId
                  : selectedEvent.extendedProps.candidate.jobId?._id,
              title:
                selectedEvent.extendedProps.candidate.jobDetails?.title || "",
              description:
                selectedEvent.extendedProps.candidate.jobDetails?.description ||
                "",
            },
            status: selectedEvent.extendedProps.candidate.status || "applied",
            assignment: {
              interviewerId:
                selectedEvent.extendedProps.candidate.assignment
                  ?.interviewerId || "",
              deadline:
                selectedEvent.start?.toISOString() || new Date().toISOString(),
              assignedAt: new Date().toISOString(),
              assignment: {
                status:
                  selectedEvent.extendedProps.candidate.assignment?.assignment
                    ?.status || "",
              },
            },
          }}
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onUpdate={() => refetch()}
          hideEditButton={true}
        />
      )}
    </div>
  );
}
