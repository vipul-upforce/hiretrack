'use client';

import React, { useEffect, useState } from 'react';
import { EventClickArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import { Candidate } from '@/types/candidate';
import { Calendar as CalendarIcon } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import LoaderSkeletonCalender from './components/loader-skeleton-calender';
import { CandidateDetailsDialog } from '../jobs/[id]/components/Dialogs/candidate-details-dialog';
import { StatsCards } from './components/stats-cards';
import { CalendarHeader } from './components/calendar-header';
import { CalendarContent } from './components/calendar-content';
import { useCalendarData } from './hooks/useCalendarData';
import { useCalendarFilters } from './hooks/useCalendarFilters';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useCalendarStats } from './hooks/useCalendarStats';
import { useCalendarView } from './hooks/useCalendarView';
import { CustomCalendarEvent } from './types';
import './calendar.css';

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<
    CustomCalendarEvent | Candidate | null
  >(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const {
    assignments: mergedAssignments,
    isLoading,
    refetch,
    user,
    role,
  } = useCalendarData(setSelectedEvent as () => void, selectedEvent);

  const { searchText, setSearchText, applyFilter, filterAssignments } =
    useCalendarFilters();

  const {
    selectedDate,
    calendarView,
    calendarRef,
    handleDateSelect,
    handleViewChange,
    handleToday,
  } = useCalendarView();

  useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedEvent(null);
    }
  }, [isDetailsOpen]);

  const filteredAssignments = filterAssignments(
    mergedAssignments,
    role || '',
    (user as { id?: string })?.id,
  );

  const { events } = useCalendarEvents(filteredAssignments, calendarView);
  const { todayCount, thisWeekCount, totalInterviews, upcomingCount } =
    useCalendarStats(events);

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

  if (isLoading) {
    return <LoaderSkeletonCalender />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
        </div>
      </div>

      <CalendarHeader
        searchText={searchText}
        onSearchTextChange={(text) => {
          // Only escape characters that require it in a character class.
          // Includes /, |, (, and ) which were missing in your second version
          const sanitized = text.replace(/[\\/*+?|{}[\]()^$]/g, '');
          setSearchText(sanitized);
        }}
        onApplyFilter={applyFilter}
        calendarView={calendarView}
        onViewChange={handleViewChange}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pb-6 pt-4 sm:px-6">
          <StatsCards
            todayCount={todayCount}
            thisWeekCount={thisWeekCount}
            totalInterviews={totalInterviews}
            upcomingCount={upcomingCount}
          />
        </div>

        <CalendarContent
          calendarRef={calendarRef as React.RefObject<FullCalendar>}
          calendarView={calendarView}
          events={events}
          selectedDate={selectedDate}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onDateSelect={handleDateSelect}
          onSidebarEventClick={handleSidebarEventClick}
          onToday={handleToday}
        />
      </div>

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
