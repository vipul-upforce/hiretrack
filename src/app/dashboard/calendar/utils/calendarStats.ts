import { CustomCalendarEvent } from '../page';

/**
 * Calculate the count of events happening today
 */
export const calculateTodayCount = (
  events: CustomCalendarEvent[],
  today: Date,
): number => {
  return events.filter((e) => {
    if (!e.start) return false;
    const d = new Date(e.start);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;
};

/**
 * Calculate the count of events happening this week
 */
export const calculateThisWeekCount = (
  events: CustomCalendarEvent[],
  today: Date,
): number => {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return events.filter((e) => {
    if (!e.start) return false;
    const d = new Date(e.start);
    d.setHours(0, 0, 0, 0);
    return d >= start && d <= end;
  }).length;
};

/**
 * Calculate the count of upcoming events (after today)
 */
export const calculateUpcomingCount = (
  events: CustomCalendarEvent[],
  today: Date,
): number => {
  return events.filter((e) => {
    if (!e.start) return false;
    const d = new Date(e.start);
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  }).length;
};

/**
 * Get today's date at midnight
 */
export const getTodayMidnight = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
