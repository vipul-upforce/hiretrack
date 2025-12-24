'use client';

import * as React from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DatePicker } from './date-picker';

interface DateTimePickerProps {
  value?: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY hh:mm aa',
}: DateTimePickerProps) {
  // Convert Dayjs to Date for the new DatePicker
  // const dateValue = value ? value.toDate() : null;
  const dateValue = React.useMemo(
    () => (value ? value.toDate() : null),
    [value?.valueOf()],
  ); // Use valueOf() to compare actual timestamp

  // const handleDateChange = (date: any) => {
  //   let normalizedDate: Date | null = null;

  //   if (date && typeof date === "object") {
  //     if ("toDate" in date) {
  //       normalizedDate = date.toDate();
  //     } else if (date instanceof Date) {
  //       normalizedDate = date;
  //     }
  //   }

  //   if (normalizedDate && !isNaN(normalizedDate.getTime())) {
  //     onChange(dayjs(normalizedDate));
  //   } else {
  //     onChange(null);
  //   }

  //   onBlur?.();
  // };
  const handleDateChange = React.useCallback(
    (date: Date | null) => {
      let normalizedDate: Date | null = null;

      if (date && typeof date === 'object') {
        if (date instanceof Date) {
          normalizedDate = date;
        }
      }

      // Convert to Dayjs
      const newDayjsValue =
        normalizedDate && !Number.isNaN(normalizedDate.getTime())
          ? dayjs(normalizedDate)
          : null;

      // Only call onChange if the value actually changed
      const currentTimestamp = value?.valueOf() || null;
      const newTimestamp = newDayjsValue?.valueOf() || null;

      if (currentTimestamp !== newTimestamp) {
        onChange(newDayjsValue);
      }
    },
    [value, onChange],
  );

  return (
    <DatePicker
      value={dateValue}
      onChange={handleDateChange}
      placeholder={placeholder}
      showTimePicker
      showNowButton
      timePickerPosition="right"
      format="MM/DD/YYYY hh:mm A"
    />
  );
}
