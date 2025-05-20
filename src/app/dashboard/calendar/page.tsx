"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetchAssignedCandidatesQuery } from "@/lib/features/candidate/candidateApi";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useEffect, useState, useRef } from "react";
import { EventClickArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CandidateDetailsDialog } from "../jobs/[id]/components/Dialogs/candidate-details-dialog";
import { formatTime } from "../jobs/[id]/hooks/dateTimeFormatting";
import { CandidateStatus } from "@/types/candidate";
import { Assignment } from "@/types/assignment";
import LoaderSkeletonCalender from "./components/loader-skeleton-calender";
import { RenderEvent } from "./components/renderCalendarEvent"; // Updated import name

interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  skills?: string[];
}

export interface CandidateAssignment {
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

export interface CustomCalendarEvent {
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
  const [searchText, setSearchText] = useState("");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedEvent(null);
    }
  }, [isDetailsOpen]);

  const applyFilter = () => {
    setFilterText(searchText);
  };

  const filteredAssignments = assignments?.filter((assignment) => {
    if (!filterText) return true;
    const searchRegex = new RegExp(filterText, "i");

    const jobSkills =
      (typeof assignment.jobId === "object" && assignment.jobId?.skills) || [];
    const assignmentSkills = assignment.skills || [];
    const assignmentJobSkills = assignment.assignment?.jobId?.skills || [];
    const allSkills = [
      ...jobSkills,
      ...assignmentSkills,
      ...assignmentJobSkills,
    ];

    return (
      searchRegex.test(assignment.name || "") ||
      searchRegex.test(
        assignment.jobId && typeof assignment.jobId === "object"
          ? assignment.jobId.title
          : ""
      ) ||
      searchRegex.test(
        (typeof assignment?.assignment?.interviewerId === "object" &&
          assignment?.assignment?.interviewerId?.name) ||
          ""
      ) ||
      (allSkills.length > 0 &&
        allSkills.some((skill) => searchRegex.test(skill || "")))
    );
  });

  const events: CustomCalendarEvent[] =
    filteredAssignments?.map((candidate) => {
      const startTime = candidate?.assignment?.time
        ? new Date(candidate.assignment.time)
        : new Date();
      const endTime = candidate?.assignment?.time
        ? new Date(candidate.assignment.time)
        : new Date();

      return {
        id: candidate._id,
        title:
          candidate?.jobId && typeof candidate.jobId === "object"
            ? candidate.jobId.title
            : "Unknown",
        start: startTime,
        end: endTime,
        allDay: false,
        startStr: startTime.toISOString(),
        endStr: endTime.toISOString(),
        url: "",
        display: "auto",
        extendedProps: {
          candidate: {
            ...candidate,
            jobId:
              typeof candidate.jobId === "string"
                ? candidate.jobId
                : (candidate.jobId as Job)?._id,
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
      };
    }) || [];

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
        allDay: false,
        startStr: eventDate.toISOString(),
        endStr: eventDate.toISOString(),
        url: "",
        display: "auto",
        extendedProps: {
          candidate: {
            ...eventsOnDate[0].extendedProps.candidate,
            assignment: eventsOnDate[0].extendedProps.candidate.assignment || {
              interviewerId: "",
              time: "",
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

      {/* Search Input and Filter Button */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Search assignments..."
          value={searchText}
          onChange={(e) => {
            const value = e.target.value;
            const sanitizedValue = value.replace(
              /[\/\\*+\?|\{\}\[\]()^$\.]/g,
              ""
            );

            setSearchText(sanitizedValue);
          }}
          className="max-w-md"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              applyFilter();
            }
          }}
        />
        <Button onClick={applyFilter}>Filter</Button>
        <Button onClick={() => setFilterText("")}>Clear</Button>
      </div>

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
                  <div className="bg-white w-full rounded-lg border border-gray-200 p-1.5 shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer">
                    <div className="flex items-baseline gap-1 items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {arg.event._def.extendedProps.candidate.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {arg.event.start ? formatTime(arg.event.start) : ""}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 truncate">
                      {arg.event._def.extendedProps.interviewer.name}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {arg.event.title}
                    </div>
                  </div>
                );
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-[calc(100vh-140px)] overflow-auto sticky top-6">
          <CardHeader>
            <CardTitle>Today's Interview</CardTitle>
          </CardHeader>
          <CardContent>
            {events
              .filter(
                (event) =>
                  new Date(event.start).toLocaleDateString() ===
                  new Date().toLocaleDateString()
              )
              .map((event, i) => (
                <RenderEvent
                  key={i}
                  event={event}
                  events={events}
                  getInterviewerName={getInterviewerName}
                  index={i}
                />
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
              time:
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
          onUpdate={async () => {
            const { data } = await refetch();
            const updatedCandidate = data?.find(
              (candidate) =>
                candidate._id === selectedEvent?.extendedProps.candidate._id
            );
            if (updatedCandidate) {
              setSelectedEvent({
                ...selectedEvent,
                extendedProps: {
                  ...selectedEvent.extendedProps,
                  candidate: updatedCandidate,
                },
              });
            }
          }}
          hideEditButton={true}
        />
      )}
    </div>
  );
}
