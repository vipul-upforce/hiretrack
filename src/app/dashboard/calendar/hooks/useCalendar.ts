'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EventClickArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { useFetchAssignedCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import { CandidateAssignment, CustomCalendarEvent, Job } from '../page';

export interface UseCalendarReturn {
  // State
  selectedEvent: CustomCalendarEvent | Candidate | null;
  setSelectedEvent: (event: CustomCalendarEvent | Candidate | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  calendarRef: React.RefObject<FullCalendar | null>;
  searchText: string;
  setSearchText: (text: string) => void;
  filterText: string;
  setFilterText: (text: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  calendarView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  setCalendarView: (
    view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek',
  ) => void;

  // Data
  isLoading: boolean;
  refetch: () => void;
  user: { id?: string; role?: string } | null;
  role: string;

  // Computed
  events: CustomCalendarEvent[];
  todayCount: number;
  thisWeekCount: number;
  totalInterviews: number;
  upcomingCount: number;

  // Handlers
  applyFilter: () => void;
  handleEventClick: (arg: EventClickArg) => void;
  handleSidebarEventClick: (event: CustomCalendarEvent) => void;
  handleDateClick: (arg: DateClickArg) => void;
  handleDateSelect: (date: Date) => void;
  handleViewChange: (
    view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek',
  ) => void;
  handleUpdate: () => Promise<void>;
}

/**
 * Custom hook for managing calendar functionality.
 * Handles all state, API calls, filtering, event creation, and business logic for the calendar.
 *
 * @returns All state, handlers, and computed values needed by the calendar component
 */
export function useCalendar(): UseCalendarReturn {
  const {
    data: assignments,
    isLoading,
    refetch,
  } = useFetchAssignedCandidatesQuery();

  const [selectedEvent, setSelectedEvent] = useState<
    CustomCalendarEvent | Candidate | null
  >(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<
    'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'
  >('dayGridMonth');

  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || '';

  const { candidates: sseCandidates } = useSSE(setSelectedEvent, selectedEvent);

  // Refetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Clear selected event when dialog closes
  useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedEvent(null);
    }
  }, [isDetailsOpen]);

  /**
   * Applies the search filter
   */
  const applyFilter = () => {
    setFilterText(searchText.trim());
  };

  // Create SSE updates map
  const sseUpdatesMap = useMemo(
    () => new Map(sseCandidates.map((c: CandidateAssignment) => [c._id, c])),
    [sseCandidates],
  );

  // Merge SSE updates with assignments
  const mergedAssignments = useMemo(() => {
    const baseAssignments =
      assignments && assignments[0]?.data ? [...assignments[0].data] : [];

    const merged = baseAssignments
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
            if (interviewerId === user?.id) {
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
      .filter(Boolean) as CandidateAssignment[];

    // Add NEW assignments that came via SSE but aren't in DB yet
    sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
      const existsInDb = baseAssignments.some(
        (a: CandidateAssignment) => a._id === sseCandidate._id,
      );

      if (!existsInDb) {
        // For interviewers, only add if assigned to them
        if (role === 'interviewer') {
          const interviewerId =
            typeof sseCandidate.assignment?.interviewerId === 'object'
              ? sseCandidate.assignment?.interviewerId?._id
              : sseCandidate.assignment?.interviewerId;

          if (interviewerId === user?.id) {
            merged.push(sseCandidate);
          }
        } else {
          merged.push(sseCandidate);
        }
      }
    });

    return merged;
  }, [assignments, sseUpdatesMap, sseCandidates, role, user]);

  // Filter assignments based on role and search text
  const filteredAssignments = useMemo(
    () =>
      mergedAssignments.filter((assignment: CandidateAssignment) => {
        // If the current role is interviewer, only include assignments assigned to the current interviewer
        if (role === 'interviewer') {
          const interviewerId =
            typeof assignment?.assignment?.interviewerId === 'object'
              ? assignment?.assignment?.interviewerId?._id
              : assignment?.assignment?.interviewerId;
          if (
            !assignment?.assignment ||
            interviewerId !== user?.id ||
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
      }),
    [mergedAssignments, role, user, filterText],
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

  // Create calendar events from filtered assignments
  const events: CustomCalendarEvent[] = useMemo(
    () =>
      filteredAssignments
        ?.map((candidate: CandidateAssignment, index: number) => {
          // Only include valid time values, omitting events without a real date
          const rawTime = candidate?.assignment?.time;
          if (!rawTime) {
            // If no time, do not produce an event object
            return undefined;
          }
          const startTime = new Date(rawTime);
          // End time = start + 1 sec
          const endTime = new Date(startTime.getTime() + 1000);

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

          // Make sure types match: start/end must be Date|undefined (not null)
          return {
            id: candidate._id,
            title,
            start: startTime as Date,
            startStr: startTime.toISOString(),
            end:
              calendarView === 'dayGridMonth' ? (endTime as Date) : startTime,
            endStr:
              calendarView === 'dayGridMonth' ? endTime.toISOString() : '',
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
          } as CustomCalendarEvent;
        })
        .filter((event): event is CustomCalendarEvent => !!event) || [],
    [filteredAssignments, calendarView],
  );

  /**
   * Handles event click from calendar
   */
  const handleEventClick = (arg: EventClickArg) => {
    const { event } = arg;
    if (event.extendedProps?.candidate && event.extendedProps?.interviewer) {
      const calendarEvent = event as unknown as CustomCalendarEvent;
      setSelectedEvent(calendarEvent);
      setIsDetailsOpen(true);
    }
  };

  /**
   * Handles event click from sidebar
   */
  const handleSidebarEventClick = (event: CustomCalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  /**
   * Handles date click on calendar
   */
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

  /**
   * Handles date selection
   */
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.getApi().gotoDate(date);
  };

  /**
   * Handles view change
   */
  const handleViewChange = (
    view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek',
  ) => {
    setCalendarView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  /**
   * Handles candidate update
   */
  const handleUpdate = async () => {
    const { data } = await refetch();
    const updatedCandidate = data?.[0]?.data?.find(
      (c) =>
        c._id ===
        (selectedEvent as CustomCalendarEvent).extendedProps.candidate._id,
    );
    if (updatedCandidate && selectedEvent) {
      setSelectedEvent({
        ...selectedEvent,
        extendedProps: {
          ...(selectedEvent as CustomCalendarEvent).extendedProps,
          candidate: updatedCandidate,
        },
      });
    }
  };

  // Calculate stats
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const todayCount = useMemo(
    () =>
      events.filter((event) => {
        if (!event.start) return false;
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime();
      }).length,
    [events, today],
  );

  const thisWeekCount = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return events.filter((event) => {
      if (!event.start) return false;
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    }).length;
  }, [events, today]);

  const totalInterviews = events.length;

  const upcomingCount = useMemo(
    () =>
      events.filter((event) => {
        if (!event.start) return false;
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() > today.getTime();
      }).length,
    [events, today],
  );

  return {
    // State
    selectedEvent,
    setSelectedEvent,
    isDetailsOpen,
    setIsDetailsOpen,
    calendarRef,
    searchText,
    setSearchText,
    filterText,
    setFilterText,
    selectedDate,
    setSelectedDate,
    calendarView,
    setCalendarView,

    // Data
    isLoading,
    refetch,
    user,
    role,

    // Computed
    events,
    todayCount,
    thisWeekCount,
    totalInterviews,
    upcomingCount,

    // Handlers
    applyFilter,
    handleEventClick,
    handleSidebarEventClick,
    handleDateClick,
    handleDateSelect,
    handleViewChange,
    handleUpdate,
  };
}
