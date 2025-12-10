'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useFetchAssignedCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { useEffect, useState, useRef } from 'react';
import { EventClickArg } from '@fullcalendar/core';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { Candidate, CandidateStatus } from '@/types/candidate';
import { Assignment } from '@/types/assignment';
import { useSSE } from '@/hooks/useSSE';
import useRoles from '@/hooks/useRoles';
import { useSelector } from 'react-redux';
import LoaderSkeletonCalender from './components/loader-skeleton-calender';
import { formatTime } from '../jobs/[id]/hooks/dateTimeFormatting';
import { CandidateDetailsDialog } from '../jobs/[id]/components/Dialogs/candidate-details-dialog';
import { StatsCards } from './components/stats-cards';
import { CalendarSidebar } from './components/calendar-sidebar';
import './calendar.css';

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
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<
    'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'
  >('dayGridMonth');

  const { user } = useSelector((state: any) => state.auth || {});
  const role = useRoles();
  const { candidates: sseCandidates } = useSSE(
    role || '',
    setSelectedEvent,
    selectedEvent,
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

  const sseUpdatesMap = new Map(
    sseCandidates.map((c: CandidateAssignment) => [c._id, c]),
  );

  const mergedAssignments = (
    assignments && assignments[0]?.data ? [...assignments[0].data] : []
  )
    .map((assignment: CandidateAssignment) => {
      // Check if there's an SSE update for this assignment
      const sseUpdate = sseUpdatesMap.get(assignment._id);

      // If there's an SSE update, use it (it's fresher data)
      if (sseUpdate) {
        // For interviewers, verify they're still assigned
        if (role === 'interviewer') {
          const interviewerId =
            typeof sseUpdate.assignment?.interviewerId === 'object'
              ? sseUpdate.assignment?.interviewerId?._id
              : sseUpdate.assignment?.interviewerId;

          // Only use SSE update if interviewer is still assigned
          if (interviewerId === user.id) {
            return sseUpdate;
          }
          // If interviewer was unassigned via SSE, filter out later
          return null;
        }
        return sseUpdate;
      }

      // No SSE update? Keep original assignment
      return assignment;
    })
    .filter(Boolean); // Remove nulls (unassigned interviews)

  // Add NEW assignments that came via SSE but aren't in DB yet
  sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
    const existsInDb = assignments?.[0]?.data?.some(
      (a: CandidateAssignment) => a._id === sseCandidate._id,
    );

    if (!existsInDb) {
      // For interviewers, only add if assigned to them
      if (role === 'interviewer') {
        const interviewerId =
          typeof sseCandidate.assignment?.interviewerId === 'object'
            ? sseCandidate.assignment?.interviewerId?._id
            : sseCandidate.assignment?.interviewerId;

        if (interviewerId === user.id) {
          mergedAssignments.push(sseCandidate);
        }
      } else {
        mergedAssignments.push(sseCandidate);
      }
    }
  });
  // debugger;
  const filteredAssignments = mergedAssignments.filter(
    (assignment: CandidateAssignment) => {
      // If the current role is interviewer, only include assignments assigned to the current interviewer
      if (role === 'interviewer') {
        // debugger;
        const interviewerId =
          typeof assignment?.assignment?.interviewerId === 'object'
            ? assignment?.assignment?.interviewerId?._id
            : assignment?.assignment?.interviewerId;
        if (
          !assignment?.assignment ||
          interviewerId !== user.id ||
          !interviewerId
        ) {
          return false;
        }
      }

      if (!filterText) return true;
      const searchRegex = new RegExp(filterText, 'i');

      const jobSkills =
        (typeof assignment.jobId === 'object' && assignment.jobId?.skills) ||
        [];
      const assignmentSkills = assignment.skills || [];
      const assignmentJobSkills =
        (typeof assignment.assignment?.jobId !== 'string' &&
          assignment.assignment?.jobId?.skills) ||
        [];
      const allSkills = [
        ...jobSkills,
        ...assignmentSkills,
        ...assignmentJobSkills,
      ];

      return (
        searchRegex.test(assignment.name || '') ||
        searchRegex.test(
          assignment.jobId && typeof assignment.jobId === 'object'
            ? assignment.jobId.title
            : '',
        ) ||
        searchRegex.test(
          (typeof assignment?.assignment?.interviewerId === 'object' &&
            assignment?.assignment?.interviewerId?.name) ||
            '',
        ) ||
        (allSkills.length > 0 &&
          allSkills.some((skill) => searchRegex.test(skill || '')))
      );
    },
  );

  // Event color palette for better visual distinction
  const eventColors = [
    { bg: '#3b82f6', border: '#2563eb' }, // blue
    { bg: '#10b981', border: '#059669' }, // green
    { bg: '#8b5cf6', border: '#7c3aed' }, // purple
    { bg: '#14b8a6', border: '#0d9488' }, // teal
    { bg: '#f59e0b', border: '#d97706' }, // amber
    { bg: '#ec4899', border: '#db2777' }, // pink
  ];

  const events: CustomCalendarEvent[] =
    filteredAssignments?.map(
      (candidate: CandidateAssignment, index: number) => {
        // Start time
        const startTime = candidate?.assignment?.time
          ? new Date(candidate.assignment.time)
          : null;
        // End time = start + 1 sec
        const endTime = startTime ? new Date(startTime.getTime() + 1000) : null;

        const hasGoogleMeet = candidate?.assignment?.googleMeet;

        const baseTitle =
          candidate?.jobId && typeof candidate.jobId === 'object'
            ? candidate.jobId.title
            : 'Unknown';

        const title = hasGoogleMeet ? `📹 ${baseTitle}` : baseTitle;

        // Colors
        const colorIndex = index % eventColors.length;
        const color = hasGoogleMeet
          ? { bg: '#3b82f6', border: '#1d4ed8' }
          : eventColors[colorIndex];

        return {
          id: candidate._id,
          title,
          start: startTime,
          startStr: startTime?.toISOString() || '',
          end: calendarView === 'dayGridMonth' ? endTime : startTime,
          endStr:
            calendarView === 'dayGridMonth' ? endTime?.toISOString() || '' : '',
          allDay: false,
          display: 'auto',
          backgroundColor: color.bg,
          borderColor: color.border,
          url: '',
          extendedProps: {
            candidate: {
              ...candidate,
              jobId:
                typeof candidate?.jobId === 'string'
                  ? candidate?.jobId
                  : (candidate?.jobId as Job)?._id,
              jobDetails:
                typeof candidate?.jobId === 'string'
                  ? undefined
                  : {
                      title: (candidate?.jobId as Job)?.title,
                      description: (candidate?.jobId as Job)?.description,
                    },
            },
            interviewer:
              typeof candidate?.assignment?.interviewerId === 'string'
                ? {
                    _id: candidate?.assignment?.interviewerId,
                    name: 'Unknown',
                    email: 'Unknown',
                  }
                : candidate?.assignment?.interviewerId || {
                    _id: '',
                    name: 'Unknown',
                    email: 'Unknown',
                  },
          },
        };
      },
    ) || [];

  const handleEventClick = (arg: EventClickArg) => {
    const { event } = arg;
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
      (event) => event?.start?.toISOString().split('T')[0] === arg?.dateStr,
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
        url: '',
        display: 'auto',
        extendedProps: {
          candidate: {
            ...eventsOnDate[0].extendedProps.candidate,
            assignment: eventsOnDate[0].extendedProps.candidate.assignment || {
              interviewerId: '',
              time: '',
              assignedAt: new Date().toISOString(),
              status: '',
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
    view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek',
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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Interview Calendar
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage interviews, screenings, assignments, and follow-ups
              </p>
            </div>
          </div>

          {/* Search + View Switch */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-between">
            {/* Search */}
            <div className="flex w-full gap-2 sm:w-auto">
              <Input
                placeholder="Search by name, job, or skills..."
                value={searchText}
                onChange={(e) => {
                  const value = e.target.value.replace(
                    /[\/\\*+\?|\{\}\[\]()^$\.]/g,
                    '',
                  );
                  setSearchText(value);
                }}
                className="flex-1 sm:w-64"
                onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
              />

              <Button variant="outline" size="icon" onClick={applyFilter}>
                <Search className="h-4 w-4" />
              </Button>

              {filterText && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setFilterText('');
                    setSearchText('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Views */}
            <div className="flex gap-1 overflow-hidden rounded-lg border p-1">
              <Button
                variant={calendarView === 'dayGridMonth' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('dayGridMonth')}
              >
                Month
              </Button>
              <Button
                variant={calendarView === 'timeGridWeek' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('timeGridWeek')}
              >
                Week
              </Button>
              <Button
                variant={calendarView === 'timeGridDay' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('timeGridDay')}
              >
                Day
              </Button>
              <Button
                variant={calendarView === 'listWeek' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('listWeek')}
              >
                Agenda
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* BODY scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="px-4 pb-6 pt-4 sm:px-6">
          <StatsCards
            todayCount={todayCount}
            thisWeekCount={thisWeekCount}
            totalInterviews={totalInterviews}
            upcomingCount={upcomingCount}
          />
        </div>

        {/* Main Content */}
        <div className="px-4 pb-6 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
            {/* Sidebar */}
            <div className="min-h-0">
              <CalendarSidebar
                events={events}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onEventClick={handleSidebarEventClick}
              />
            </div>

            {/* Calendar */}
            <Card className="flex h-full min-h-[500px] flex-col border border-border/50">
              <CardContent className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    listPlugin,
                    interactionPlugin,
                  ]}
                  initialView={calendarView}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: '',
                  }}
                  customButtons={{
                    today: {
                      text: 'Today',
                      click: () => {
                        calendarRef.current?.getApi().today();
                        setSelectedDate(new Date());
                      },
                    },
                  }}
                  height="100%"
                  contentHeight="100%"
                  handleWindowResize
                  nowIndicator
                  allDaySlot={false}
                  eventTextColor="#fff"
                  slotMinTime="00:00:00"
                  slotMaxTime="24:00:00"
                  eventContent={(arg) => {
                    if (calendarView === 'listWeek') {
                      // List view has its own rendering
                      return null;
                    }

                    const { candidate } = arg.event._def.extendedProps;
                    const { interviewer } = arg.event._def.extendedProps;
                    const jobTitle =
                      typeof candidate.jobId !== 'string' &&
                      candidate.jobId?.title
                        ? candidate.jobId.title
                        : candidate.jobDetails?.title || '';

                    if (
                      calendarView === 'timeGridWeek' ||
                      calendarView === 'timeGridDay'
                    ) {
                      // Time grid view
                      return (
                        <div className="h-full w-full overflow-hidden break-words px-2 py-1">
                          {/* <div className="font-semibold text-xs truncate overflow-hidden max-w-full">
                                            {candidate.name}
                                          </div> */}
                          <div className="mb-0.5 flex max-w-full items-center gap-1 overflow-hidden">
                            <div className="min-w-0 flex-1 overflow-hidden truncate text-[11px] font-medium">
                              {candidate.name}
                            </div>
                            {arg.event.start && (
                              <span className="shrink-0 whitespace-nowrap text-[10px] opacity-80">
                                {formatTime(arg.event.start)}
                              </span>
                            )}
                          </div>
                          {jobTitle && (
                            <div className="max-w-full overflow-hidden truncate text-[10px] capitalize opacity-80">
                              {jobTitle}
                            </div>
                          )}
                          {interviewer.name &&
                            interviewer.name !== 'Unknown' && (
                              <div className="max-w-full overflow-hidden truncate text-[10px] capitalize opacity-75">
                                {interviewer.name}
                              </div>
                            )}
                        </div>
                      );
                    }

                    // Month view
                    return (
                      <div className="h-full w-full overflow-hidden break-words px-1.5 py-0.5">
                        <div className="mb-0.5 flex max-w-full items-center gap-1 overflow-hidden">
                          <div className="min-w-0 flex-1 overflow-hidden truncate text-[11px] font-medium">
                            {candidate.name}
                          </div>
                          {arg.event.start && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] opacity-80">
                              {formatTime(arg.event.start)}
                            </span>
                          )}
                        </div>
                        {jobTitle && (
                          <div className="max-w-full overflow-hidden truncate text-[9px] capitalize opacity-75">
                            {jobTitle}
                          </div>
                        )}
                        {interviewer.name && interviewer.name !== 'Unknown' && (
                          <div className="max-w-full overflow-hidden truncate text-[9px] capitalize opacity-70">
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
      </div>

      {/* Candidate Dialog */}
      {selectedEvent && (
        <CandidateDetailsDialog
          candidate={{
            ...selectedEvent.extendedProps.candidate,
            jobId: {
              _id:
                typeof selectedEvent.extendedProps.candidate.jobId === 'string'
                  ? selectedEvent.extendedProps.candidate.jobId
                  : selectedEvent.extendedProps.candidate.jobId?._id,
              title:
                selectedEvent.extendedProps.candidate.jobDetails?.title || '',
              description:
                selectedEvent.extendedProps.candidate.jobDetails?.description ||
                '',
            },
            status: selectedEvent.extendedProps.candidate.status || 'applied',
            assignment: {
              interviewerId:
                selectedEvent.extendedProps.candidate.assignment
                  ?.interviewerId || '',
              time:
                selectedEvent.start?.toISOString() || new Date().toISOString(),
              assignedAt: new Date().toISOString(),
              googleMeet:
                selectedEvent.extendedProps.candidate.assignment?.googleMeet ||
                null,
              assignment: {
                status:
                  selectedEvent.extendedProps.candidate.assignment?.assignment
                    ?.status || '',
              },
            },
          }}
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onUpdate={async () => {
            const { data } = await refetch();
            const updatedCandidate = data?.find(
              (c) => c._id === selectedEvent?.extendedProps.candidate._id,
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
          hideEditButton
        />
      )}
    </div>
  );
}
