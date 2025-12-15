'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, UserRound } from 'lucide-react';

import { MiniCalendar } from './mini-calendar';
import { formatTime } from '../../jobs/[id]/hooks/dateTimeFormatting';
import { CustomCalendarEvent, Job } from '../types';

interface CalendarSidebarProps {
  events: CustomCalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CustomCalendarEvent) => void;
}

export function CalendarSidebar({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}: CalendarSidebarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysEvents = events.filter((event) => {
    if (!event.start) return false;
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === today.getTime();
  });

  const upcomingEvents = events
    .filter((event) => {
      if (!event.start) return false;
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() > today.getTime();
    })
    .sort((a, b) => {
      if (!a.start || !b.start) return 0;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    })
    .slice(0, 5); // Show only next 5 upcoming events

  const notScheduledEvents = events.filter((event) => !event.start);

  const eventDates = events
    .filter((e) => e.start)
    .map((e) => new Date(e.start!));

  const renderEventCard = (
    event: CustomCalendarEvent,
    index: number,
    showDate: boolean = false,
  ) => {
    const { candidate } = event.extendedProps;
    const { interviewer } = event.extendedProps;

    return (
      <button
        type="button"
        key={index}
        onClick={() => onEventClick(event)}
        className="w-full cursor-pointer rounded-md border p-2 text-left transition-colors hover:bg-accent/50"
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-1 text-sm font-semibold">
              {candidate.name}
            </h4>
            {typeof candidate.jobId !== 'string' &&
              (candidate.jobId as Job)?.title && (
                <p className="line-clamp-1 text-xs capitalize text-muted-foreground">
                  {(candidate.jobId as Job).title}
                </p>
              )}
          </div>
          {candidate.status && (
            <Badge
              variant="secondary"
              className="shrink-0 px-2 py-0.5 text-[10px]"
            >
              {candidate.status}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          {event.start && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(event.start)}</span>
            </div>
          )}
          {interviewer.name && interviewer.name !== 'Unknown' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="h-3 w-3" />
              <span className="line-clamp-1 capitalize">
                {interviewer.name}
              </span>
            </div>
          )}
          {showDate && event.start && (
            <div className="mt-1 border-t pt-1 text-xs text-muted-foreground">
              {new Date(event.start).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <aside className="h-full w-full space-y-3 overflow-hidden md:w-full lg:w-[260px] xl:w-[300px]">
      <div className="flex h-full flex-col gap-3 overflow-auto rounded-lg border p-3">
        {/* Today's Schedule */}
        <Card className="max-h-[300px] flex-shrink-0 overflow-y-auto">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              Today&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {todaysEvents.length > 0 ? (
              <div className="space-y-1.5">
                {todaysEvents.map((event, index) =>
                  renderEventCard(event, index),
                )}
              </div>
            ) : (
              <div className="py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  No events scheduled for today
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="max-h-[370px] flex-shrink-0 overflow-y-auto">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingEvents.map((event, index) =>
                  renderEventCard(event, index, true),
                )}
              </div>
            ) : (
              <div className="py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  No upcoming events
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Not Scheduled */}
        <Card className="max-h-[300px] flex-shrink-0 overflow-y-auto">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              Not Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {notScheduledEvents.length > 0 ? (
              <div className="space-y-1.5">
                {notScheduledEvents.map((event, index) =>
                  renderEventCard(event, index),
                )}
              </div>
            ) : (
              <div className="py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  All candidates are scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Calendar */}
        <Card className="max-h-full flex-shrink-0">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              Quick Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              eventDates={eventDates}
            />
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
