'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { EventClickArg, EventContentArg } from '@fullcalendar/core';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { CustomCalendarEvent, CalendarView } from '../types';
import { formatTime } from '../../jobs/[id]/hooks/dateTimeFormatting';
import { CalendarSidebar } from './calendar-sidebar';

interface CalendarContentProps {
  calendarRef: React.RefObject<FullCalendar>;
  calendarView: CalendarView;
  events: CustomCalendarEvent[];
  selectedDate: Date;
  onEventClick: (arg: EventClickArg) => void;
  onDateClick: (arg: DateClickArg) => void;
  onDateSelect: (date: Date) => void;
  onSidebarEventClick: (event: CustomCalendarEvent) => void;
  onToday: () => void;
}

export function CalendarContent({
  calendarRef,
  calendarView,
  events,
  selectedDate,
  onEventClick,
  onDateClick,
  onDateSelect,
  onSidebarEventClick,
  onToday,
}: CalendarContentProps) {
  const renderEventContent = (arg: EventContentArg, view: CalendarView) => {
    if (view === 'listWeek') {
      return null;
    }

    const extendedProps = arg.event
      .extendedProps as CustomCalendarEvent['extendedProps'];
    const { candidate } = extendedProps;
    const { interviewer } = extendedProps;
    const jobTitle =
      typeof candidate.jobId !== 'string' && candidate.jobId?.title
        ? candidate.jobId.title
        : candidate.jobDetails?.title || '';

    if (view === 'timeGridWeek' || view === 'timeGridDay') {
      return (
        <div className="h-full w-full overflow-hidden break-words px-2 py-1">
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
          {interviewer.name && interviewer.name !== 'Unknown' && (
            <div className="max-w-full overflow-hidden truncate text-[10px] capitalize opacity-75">
              {interviewer.name}
            </div>
          )}
        </div>
      );
    }

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
  };

  return (
    <div className="px-4 pb-6 sm:px-6">
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <div className="min-h-0">
          <CalendarSidebar
            events={events}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            onEventClick={onSidebarEventClick}
          />
        </div>

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
              eventClick={onEventClick}
              dateClick={onDateClick}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              customButtons={{
                today: {
                  text: 'Today',
                  click: onToday,
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
              eventContent={(arg) => renderEventContent(arg, calendarView)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
