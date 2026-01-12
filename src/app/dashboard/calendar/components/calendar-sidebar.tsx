'use client';

import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { CustomCalendarEvent, Job } from '../page';
import { MiniCalendar } from './mini-calendar';
import { formatTime } from '../../jobs/[id]/hooks/dateTimeFormatting';

interface CalendarSidebarProps {
  events: CustomCalendarEvent[];
  qnEventDates: Date[]; // Quick nav event dates for mini calendar
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: CustomCalendarEvent) => void;
}

export function CalendarSidebar({
  events,
  qnEventDates,
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
      type='button'
        key={index}
        onClick={() => onEventClick(event)}
        className="p-2 border w-full text-left rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-1">
              {candidate.name}
            </h4>
            {typeof candidate.jobId !== 'string'
              && (candidate.jobId as Job)?.title && (
                <p className="text-xs text-muted-foreground capitalize line-clamp-1">
                  {(candidate.jobId as Job).title}
                </p>
            )}
          </div>
          {candidate.status && (
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 shrink-0"
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
              <MapPin className="h-3 w-3" />
              <span className="capitalize line-clamp-1">
                {interviewer.name}
              </span>
            </div>
          )}
          {showDate && event.start && (
            <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
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
    <aside
      className=" w-full h-full space-y-3 md:w-full lg:w-[260px] xl:w-[300px] overflow-hidden"
    >
      <div className="flex flex-col gap-3 h-full overflow-auto p-3 border rounded-lg">
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
                {todaysEvents.map((event, index) => renderEventCard(event, index))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground">
                  No events scheduled for today
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className=" max-h-[370px] flex-shrink-0 overflow-y-auto">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingEvents.map((event, index) => renderEventCard(event, index, true))}
              </div>
            ) : (
              <div className="text-center py-3">
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
                {notScheduledEvents.map((event, index) => renderEventCard(event, index))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground">
                  All candidates are scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Calendar */}
        <Card className=" max-h-full flex-shrink-0">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              Quick Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              eventDates={qnEventDates}
            />
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
