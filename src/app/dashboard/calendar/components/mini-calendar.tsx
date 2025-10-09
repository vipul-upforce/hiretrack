"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const hasEvent = (day: number | null) => {
    if (!day) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return eventDates.some((eventDate) => {
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day
      );
    });
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
      day
    );
    onDateSelect(newDate);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-accent rounded-md transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-accent rounded-md transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysOfWeek.map((day, index) => (
          <div
            key={index}
            className="text-xs font-medium text-muted-foreground h-8 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => handleDayClick(day)}
            disabled={!day}
            className={`
              h-8 text-sm rounded-md transition-colors relative
              ${
                !day
                  ? "invisible"
                  : isSelected(day)
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isToday(day)
                  ? "bg-accent font-semibold"
                  : "hover:bg-accent"
              }
            `}
          >
            {day}
            {hasEvent(day) && (
              <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
