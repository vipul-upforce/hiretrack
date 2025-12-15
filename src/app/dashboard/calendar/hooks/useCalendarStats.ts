import { useMemo } from 'react';
import { CustomCalendarEvent } from '../types';

export function useCalendarStats(events: CustomCalendarEvent[]) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const todayCount = events.filter((event) => {
      if (!event.start) return false;
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate < tomorrow;
    }).length;

    const thisWeekCount = events.filter((event) => {
      if (!event.start) return false;
      const eventDate = new Date(event.start);
      return eventDate >= startOfWeek && eventDate < endOfWeek;
    }).length;

    const totalInterviews = events.filter(
      (event) =>
        event.extendedProps.candidate.assignment?.interviewerId !== undefined,
    ).length;

    const upcomingCount = events.filter((event) => {
      if (!event.start) return false;
      return new Date(event.start) > now;
    }).length;

    return {
      todayCount,
      thisWeekCount,
      totalInterviews,
      upcomingCount,
    };
  }, [events]);

  return stats;
}
