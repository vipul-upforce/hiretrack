'use client';

import React, { useCallback } from 'react';
import { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { Candidate } from '@/types/candidate';
import { CustomCalendarEvent } from '../page';
import {
  CalendarViewType,
  ApiViewType,
  calculateDateRange,
  mapFCViewTypeToApiView,
  mapViewToApiView,
} from '../utils/dateRangeUtils';

export interface UseCalendarHandlersParams {
  setSelectedEvent: (event: CustomCalendarEvent | Candidate | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  calendarRef: React.RefObject<FullCalendar | null>;
  searchText: string;
  setSearchText: (text: string) => void;
  setFilterText: (text: string) => void;
  setFcQueryParams: React.Dispatch<
    React.SetStateAction<{
      startDate: string;
      endDate: string;
      view: ApiViewType;
      filterValue: string | undefined;
    }>
  >;
  setQnQueryParams: React.Dispatch<
    React.SetStateAction<{
      startDate: string;
      endDate: string;
      view: ApiViewType;
      filterValue: string | undefined;
    }>
  >;
  setDateRange: (range: { startDate: Date; endDate: Date }) => void;
  setSelectedDate: (date: Date) => void;
  setCalendarView: (view: CalendarViewType) => void;
  events: CustomCalendarEvent[];
  selectedDate: Date;
  refetch: () => void;
}

export interface UseCalendarHandlersReturn {
  applyFilter: () => void;
  handleDatesSet: (arg: DatesSetArg) => void;
  handleEventClick: (arg: EventClickArg) => void;
  handleSidebarEventClick: (event: CustomCalendarEvent) => void;
  handleDateClick: (arg: DateClickArg) => void;
  handleDateSelect: (date: Date) => void;
  handleViewChange: (viewType: CalendarViewType) => void;
  handleUpdate: () => Promise<void>;
}

/**
 * Hook that encapsulates all calendar event handlers and filter application.
 */
export function useCalendarHandlers(
  params: UseCalendarHandlersParams,
): UseCalendarHandlersReturn {
  const {
    setSelectedEvent,
    setIsDetailsOpen,
    calendarRef,
    searchText,
    setFilterText,
    setFcQueryParams,
    setQnQueryParams,
    setDateRange,
    setSelectedDate,
    setCalendarView,
    events,
    selectedDate,
    refetch,
  } = params;

  const applyFilter = useCallback(() => {
    const newFilter = searchText.trim();
    setFilterText(newFilter);
    setFcQueryParams((prev) => ({
      ...prev,
      filterValue: newFilter || undefined,
    }));
    setQnQueryParams((prev) => ({
      ...prev,
      filterValue: newFilter || undefined,
    }));
  }, [searchText, setFilterText, setFcQueryParams, setQnQueryParams]);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const newStartDate = arg.start.toISOString();
      const newEndDate = arg.end.toISOString();
      const apiView = mapFCViewTypeToApiView(arg.view.type);
      const newView = arg.view.type as CalendarViewType;

      setFcQueryParams((prev) => {
        if (
          prev.startDate === newStartDate &&
          prev.endDate === newEndDate &&
          prev.view === apiView
        ) {
          return prev;
        }
        return {
          ...prev,
          startDate: newStartDate,
          endDate: newEndDate,
          view: apiView,
        };
      });

      setDateRange({ startDate: arg.start, endDate: arg.end });
      setSelectedDate(arg.start);
      setCalendarView(newView);
    },
    [
      setFcQueryParams,
      setDateRange,
      setSelectedDate,
      setCalendarView,
    ],
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const { event } = arg;
      if (event.extendedProps?.candidate && event.extendedProps?.interviewer) {
        const calendarEvent = event as unknown as CustomCalendarEvent;
        setSelectedEvent(calendarEvent);
        setIsDetailsOpen(true);
      }
    },
    [setSelectedEvent, setIsDetailsOpen],
  );

  const handleSidebarEventClick = useCallback(
    (event: CustomCalendarEvent) => {
      setSelectedEvent(event);
      setIsDetailsOpen(true);
    },
    [setSelectedEvent, setIsDetailsOpen],
  );

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      const eventsOnDate = events.filter(
        (event) =>
          event?.start?.toISOString().split('T')[0] === arg?.dateStr,
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
              assignment:
                eventsOnDate[0].extendedProps.candidate.assignment || {
                  interviewerId: null,
                  time: new Date().toISOString(),
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
    },
    [events, setSelectedEvent, setIsDetailsOpen],
  );

  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);

      const newRange = calculateDateRange('dayGridMonth', date);

      setQnQueryParams((prev) => {
        const newStartDate = newRange.startDate.toISOString();
        const newEndDate = newRange.endDate.toISOString();

        if (prev.startDate === newStartDate && prev.endDate === newEndDate) {
          return prev;
        }
        return {
          ...prev,
          startDate: newStartDate,
          endDate: newEndDate,
          view: 'month',
        };
      });
    },
    [setSelectedDate, setQnQueryParams],
  );

  const handleViewChange = useCallback(
    (viewType: CalendarViewType) => {
      setCalendarView(viewType);

      const newRange = calculateDateRange(viewType, selectedDate);
      const apiView = mapViewToApiView(viewType);

      setFcQueryParams((prev) => {
        const newStartDate = newRange.startDate.toISOString();
        const newEndDate = newRange.endDate.toISOString();

        if (
          prev.startDate === newStartDate &&
          prev.endDate === newEndDate &&
          prev.view === apiView
        ) {
          return prev;
        }
        return {
          ...prev,
          startDate: newStartDate,
          endDate: newEndDate,
          view: apiView,
        };
      });

      setDateRange(newRange);

      const calApi = calendarRef.current?.getApi();
      if (calApi) {
        calApi.changeView(viewType);
      }
    },
    [selectedDate, setCalendarView, setFcQueryParams, setDateRange, calendarRef],
  );

  const handleUpdate = useCallback(async () => {
    refetch();
  }, [refetch]);

  return {
    applyFilter,
    handleDatesSet,
    handleEventClick,
    handleSidebarEventClick,
    handleDateClick,
    handleDateSelect,
    handleViewChange,
    handleUpdate,
  };
}
