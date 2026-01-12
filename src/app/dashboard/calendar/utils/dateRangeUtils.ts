/**
 * Calendar date range utilities for date-based pagination
 */

import type FullCalendar from '@fullcalendar/react';

export type CalendarViewType =
  | 'dayGridMonth'
  | 'timeGridWeek'
  | 'timeGridDay'
  | 'listWeek';
export type ApiViewType = 'month' | 'week' | 'day' | 'agenda';

/**
 * Maps FullCalendar view types to API view types
 */
export const mapViewToApiView = (view: CalendarViewType): ApiViewType => {
  switch (view) {
    case 'dayGridMonth':
      return 'month';
    case 'timeGridWeek':
      return 'week';
    case 'timeGridDay':
      return 'day';
    case 'listWeek':
      return 'agenda';
    default:
      return 'month';
  }
};

/**
 * Calculate date range based on view type and reference date
 */
export const calculateDateRange = (
  view: CalendarViewType,
  referenceDate: Date,
): { startDate: Date; endDate: Date } => {
  const date = new Date(referenceDate);

  switch (view) {
    case 'dayGridMonth': {
      // First day of the month
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      // Last day of the month
      const endDate = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { startDate, endDate };
    }
    case 'timeGridWeek': {
      // Start of week (Sunday)
      const startDate = new Date(date);
      startDate.setDate(date.getDate() - date.getDay());
      startDate.setHours(0, 0, 0, 0);
      // End of week (Saturday)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'timeGridDay': {
      // Start of day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      // End of day
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'listWeek': {
      // Agenda: Today + 7 days
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    default: {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { startDate, endDate };
    }
  }
};

/**
 * Event color palette for better visual distinction
 */
export const eventColors = [
  { bg: '#3b82f6', border: '#2563eb' }, // blue
  { bg: '#10b981', border: '#059669' }, // green
  { bg: '#8b5cf6', border: '#7c3aed' }, // purple
  { bg: '#14b8a6', border: '#0d9488' }, // teal
  { bg: '#f59e0b', border: '#d97706' }, // amber
  { bg: '#ec4899', border: '#db2777' }, // pink
];

/**
 * Maps FullCalendar internal view type string to API view type
 */
export const mapFCViewTypeToApiView = (viewType: string): ApiViewType => {
  if (viewType === 'timeGridWeek') return 'week';
  if (viewType === 'timeGridDay') return 'day';
  if (viewType === 'listWeek') return 'agenda';
  return 'month';
};

/**
 * Extract current view state from FullCalendar API
 * Returns standardized data for query params and local state updates
 */
export const extractCalendarViewState = (
  calApi: ReturnType<NonNullable<FullCalendar['getApi']>>,
): {
  startDate: string;
  endDate: string;
  apiView: ApiViewType;
  activeStart: Date;
  activeEnd: Date;
} => {
  const { view } = calApi;
  return {
    startDate: view.activeStart.toISOString(),
    endDate: view.activeEnd.toISOString(),
    apiView: mapFCViewTypeToApiView(view.type),
    activeStart: view.activeStart,
    activeEnd: view.activeEnd,
  };
};
