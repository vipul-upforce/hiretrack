import { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { CalendarView } from '../types';

export function useCalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] =
    useState<CalendarView>('dayGridMonth');
  const calendarRef = useRef<FullCalendar>(null);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.getApi().gotoDate(date);
  };

  const handleViewChange = (view: CalendarView) => {
    setCalendarView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
    setSelectedDate(new Date());
  };

  return {
    selectedDate,
    setSelectedDate,
    calendarView,
    setCalendarView,
    calendarRef,
    handleDateSelect,
    handleViewChange,
    handleToday,
  };
}
