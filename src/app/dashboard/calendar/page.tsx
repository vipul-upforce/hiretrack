"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFetchAssignedCandidatesQuery } from "@/lib/features/candidate/candidateApi";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { useEffect, useState, useRef } from "react";
import { EventClickArg } from "@fullcalendar/core";
import { DateClickArg } from "@fullcalendar/interaction";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import { CandidateDetailsDialog } from "../jobs/[id]/components/Dialogs/candidate-details-dialog";
import { formatTime } from "../jobs/[id]/hooks/dateTimeFormatting";
import { Candidate, CandidateStatus } from "@/types/candidate";
import { Assignment } from "@/types/assignment";
import LoaderSkeletonCalender from "./components/loader-skeleton-calender";
import { useSSE } from "@/hooks/useSSE";
import useRoles from "@/hooks/useRoles";
import { useSelector } from "react-redux";
import { StatsCards } from "./components/stats-cards";
import { CalendarSidebar } from "./components/calendar-sidebar";
import "./calendar.css";

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
  relevantExperience: number;
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
  start?: Date;
  end?: Date;
  allDay: boolean;
  startStr: string;
  endStr: string;
  url: string;
  display: string;
  backgroundColor?: string;
  borderColor?: string;
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
  const [selectedEvent, setSelectedEvent] = useState<
    CustomCalendarEvent | Candidate | null
  >(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const [searchText, setSearchText] = useState("");
  const [filterText, setFilterText] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<
    "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek"
  >("dayGridMonth");

  const { user } = useSelector((state: any) => state.auth || {});
  const role = useRoles();
  const { candidates: sseCandidates } = useSSE(
    role || "",
    setSelectedEvent,
    selectedEvent
  );

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedEvent(null);
    }
  }, [isDetailsOpen]);

  const applyFilter = () => {
    setFilterText(searchText.trim());
  };

  // Merge assignments with sseCandidates, prioritizing sseCandidates for updates
  const mergedAssignments = (
    assignments && assignments[0]?.data ? [...assignments[0].data] : []
  ).map((assignment: CandidateAssignment) => {
    const sseCandidate = sseCandidates.find((c: CandidateAssignment) =>
      role === "interviewer"
        ? (c._id === assignment?._id &&
            c.assignment?.interviewerId === user.id) ||
          user.id
        : c._id === assignment._id
    );
    return sseCandidate || assignment;
  });
  // Add any new candidates from sseCandidates that aren't in assignments
  sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
    if (
      !mergedAssignments.some(
        (a: CandidateAssignment) => a._id === sseCandidate._id
      )
    ) {
      mergedAssignments.push(sseCandidate);
    }
  });

  const filteredAssignments = mergedAssignments.filter(
    (assignment: CandidateAssignment) => {
      // If the current role is interviewer, only include assignments assigned to the current interviewer
      if (role === "interviewer") {
        const interviewerId =
          typeof assignment.assignment?.interviewerId === "object"
            ? assignment.assignment?.interviewerId?._id
            : assignment.assignment?.interviewerId;
        if (!assignment.assignment || interviewerId !== user.id) {
          return false;
        }
      }

      if (!filterText) return true;
      const searchRegex = new RegExp(filterText, "i");

      const jobSkills =
        (typeof assignment.jobId === "object" && assignment.jobId?.skills) ||
        [];
      const assignmentSkills = assignment.skills || [];
      const assignmentJobSkills =
        (typeof assignment.assignment?.jobId !== "string" &&
          assignment.assignment?.jobId?.skills) ||
        [];
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
    }
  );

  // Event color palette for better visual distinction
  const eventColors = [
    { bg: "#3b82f6", border: "#2563eb" }, // blue
    { bg: "#10b981", border: "#059669" }, // green
    { bg: "#8b5cf6", border: "#7c3aed" }, // purple
    { bg: "#14b8a6", border: "#0d9488" }, // teal
    { bg: "#f59e0b", border: "#d97706" }, // amber
    { bg: "#ec4899", border: "#db2777" }, // pink
  ];

  const events: CustomCalendarEvent[] =
    filteredAssignments?.map((candidate: CandidateAssignment, index: number) => {
      const startTime = candidate?.assignment?.time
        ? new Date(candidate?.assignment?.time)
        : undefined;
      const endTime = candidate?.assignment?.time
        ? new Date(candidate?.assignment?.time)
        : undefined;

      const hasGoogleMeet = candidate?.assignment?.googleMeet;
      const baseTitle =
        candidate?.jobId && typeof candidate.jobId === "object"
          ? candidate?.jobId?.title
          : "Unknown";
      const title = hasGoogleMeet ? `📹 ${baseTitle}` : baseTitle;

      // Use different colors for different candidates
      const colorIndex = index % eventColors.length;
      const color = hasGoogleMeet
        ? { bg: "#3b82f6", border: "#1d4ed8" }
        : eventColors[colorIndex];

      return {
        id: candidate._id,
        title,
        start: startTime,
        end: endTime,
        allDay: false,
        startStr: startTime?.toISOString() || "",
        endStr: endTime?.toISOString() || "",
        url: "",
        display: "auto",
        backgroundColor: color.bg,
        borderColor: color.border,
        extendedProps: {
          candidate: {
            ...candidate,
            jobId:
              typeof candidate?.jobId === "string"
                ? candidate?.jobId
                : (candidate?.jobId as Job)?._id,
            jobDetails:
              typeof candidate?.jobId === "string"
                ? undefined
                : {
                    title: (candidate?.jobId as Job)?.title,
                    description: (candidate?.jobId as Job)?.description,
                  },
          },
          interviewer:
            typeof candidate?.assignment?.interviewerId === "string"
              ? {
                  _id: candidate?.assignment?.interviewerId,
                  name: "Unknown",
                  email: "Unknown",
                }
              : candidate?.assignment?.interviewerId || {
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

  const handleSidebarEventClick = (event: CustomCalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const handleDateClick = (arg: DateClickArg) => {
    const eventsOnDate = events.filter(
      (event) => event?.start?.toISOString().split("T")[0] === arg?.dateStr
    );

    if (eventsOnDate.length === 1) {
      const eventDate = new Date(eventsOnDate[0].start!);
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.getApi().gotoDate(date);
  };

  const handleViewChange = (
    view: "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek"
  ) => {
    setCalendarView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = events.filter((event) => {
    if (!event.start) return false;
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === today.getTime();
  }).length;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const thisWeekCount = events.filter((event) => {
    if (!event.start) return false;
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= startOfWeek && eventDate <= endOfWeek;
  }).length;

  const totalInterviews = events.length;

  const upcomingCount = events.filter((event) => {
    if (!event.start) return false;
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() > today.getTime();
  }).length;

  if (isLoading) {
    return <LoaderSkeletonCalender />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Interview Calendar
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage interviews, screenings, assignments, and follow-ups
              </p>
            </div>
          </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, job, or skills..."
                value={searchText}
                onChange={(e) => {
                  const value = e.target.value;
                  const sanitizedValue = value.replace(
                    /[\/\\*+\?|\{\}\[\]()^$\.]/g,
                    ""
                  );
                  setSearchText(sanitizedValue);
                }}
                className="w-64"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    applyFilter();
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={applyFilter}>
                <Search className="h-4 w-4" />
              </Button>
              {filterText && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFilterText("");
                    setSearchText("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* View Toggle Buttons */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={calendarView === "dayGridMonth" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("dayGridMonth")}
              >
                Month
              </Button>
              <Button
                variant={calendarView === "timeGridWeek" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("timeGridWeek")}
              >
                Week
              </Button>
              <Button
                variant={calendarView === "timeGridDay" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("timeGridDay")}
              >
                Day
              </Button>
              <Button
                variant={calendarView === "listWeek" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("listWeek")}
              >
                Agenda
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex-shrink-0 px-6 pt-6">
        <StatsCards
          todayCount={todayCount}
          thisWeekCount={thisWeekCount}
          totalInterviews={totalInterviews}
          upcomingCount={upcomingCount}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 h-full">
          {/* Left Sidebar */}
          <CalendarSidebar
            events={events}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onEventClick={handleSidebarEventClick}
          />

          {/* Calendar */}
          <Card className="h-full flex flex-col overflow-hidden">
            <CardContent className="p-6 flex-1 overflow-auto">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                initialView={calendarView}
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
                      setSelectedDate(new Date());
                    },
                  },
                }}
                height="100%"
                contentHeight="100%"
                handleWindowResize={true}
                eventTextColor="#ffffff"
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                nowIndicator={true}
                eventContent={(arg) => {
                  if (calendarView === "listWeek") {
                    // List view has its own rendering
                    return null;
                  }

                  const candidate = arg.event._def.extendedProps.candidate;
                  const interviewer = arg.event._def.extendedProps.interviewer;
                  const jobTitle = typeof candidate.jobId !== "string" && candidate.jobId?.title
                    ? candidate.jobId.title
                    : candidate.jobDetails?.title || "";

                  if (
                    calendarView === "timeGridWeek" ||
                    calendarView === "timeGridDay"
                  ) {
                    // Time grid view
                    return (
                      <div className="px-2 py-1 overflow-hidden">
                        <div className="font-semibold text-xs truncate">
                          {candidate.name}
                        </div>
                        {jobTitle && (
                          <div className="text-[10px] opacity-80 truncate capitalize">
                            {jobTitle}
                          </div>
                        )}
                        {interviewer.name && interviewer.name !== "Unknown" && (
                          <div className="text-[10px] opacity-75 truncate capitalize">
                            {interviewer.name}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Month view
                  return (
                    <div className="px-1.5 py-0.5 overflow-hidden w-full">
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="font-medium text-[11px] truncate flex-1">
                          {candidate.name}
                        </div>
                        {arg.event.start && (
                          <span className="text-[10px] opacity-80 shrink-0">
                            {formatTime(arg.event.start)}
                          </span>
                        )}
                      </div>
                      {jobTitle && (
                        <div className="text-[9px] opacity-75 truncate capitalize">
                          {jobTitle}
                        </div>
                      )}
                      {interviewer.name && interviewer.name !== "Unknown" && (
                        <div className="text-[9px] opacity-70 truncate capitalize">
                          {interviewer.name}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </CardContent>
          </Card>
        </div>
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
              googleMeet:
                selectedEvent.extendedProps.candidate.assignment?.googleMeet ||
                null,
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
