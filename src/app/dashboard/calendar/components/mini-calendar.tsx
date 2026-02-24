'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  eventDates?: Date[];
}

export function MiniCalendar({
  selectedDate,
  onDateSelect,
  eventDates = [],
}: MiniCalendarProps) {
  // Mini calendar has its own month state - independent from main calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i += 1) {
      days.push(null);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(day);
    }

    return days;
  };

  const hasEvent = (day: number | null) => {
    if (!day) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return eventDates.some(
      (eventDate) =>
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day,
    );
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    onDateSelect(newDate);
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1,
    );
    setCurrentMonth(newMonth);
    // Load data for this month (silently, no loading spinner on Full calendar)
    onDateSelect(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1,
    );
    setCurrentMonth(newMonth);
    // Load data for this month (silently, no loading spinner on Full calendar)
    onDateSelect(newMonth);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-md p-1 transition-colors hover:bg-accent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded-md p-1 transition-colors hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysOfWeek.map((day, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={day + index}
            className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          let dayClasses = 'relative h-8 rounded-md text-sm transition-colors ';

          if (!day) {
            dayClasses += 'invisible';
          } else if (isSelected(day)) {
            dayClasses += 'bg-primary font-semibold text-primary-foreground';
          } else if (isToday(day)) {
            dayClasses += 'bg-accent font-semibold';
          } else {
            dayClasses += 'hover:bg-accent';
          }

          return (
            <button
              type="button"
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={!day}
              className={dayClasses}
            >
              {day}
              {hasEvent(day) && (
                <div className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
