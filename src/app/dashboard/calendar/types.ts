import React from 'react';
import { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { Candidate } from '@/types/candidate';
import { CustomCalendarEvent } from './page';
import { CalendarViewType } from './utils/dateRangeUtils';

/**
 * Return type for the useCalendar hook.
 * Contains all state, handlers, and computed values needed by the calendar component.
 */
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
  calendarView: CalendarViewType;
  setCalendarView: (view: CalendarViewType) => void;

  // Data
  isLoading: boolean;
  isInitialLoading: boolean;
  refetch: () => void;
  user: { id?: string; role?: string } | null;
  role: string;

  // Date range
  dateRange: { startDate: Date; endDate: Date };

  // Computed
  events: CustomCalendarEvent[];
  calendarEvents: CustomCalendarEvent[];
  qnEventDates: Date[]; // Quick nav event dates for mini calendar dots
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
  handleViewChange: (view: CalendarViewType) => void;
  handleDatesSet: (arg: DatesSetArg) => void;
  handleUpdate: () => Promise<void>;
}
