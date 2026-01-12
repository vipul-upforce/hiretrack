'use client';

import * as React from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DatePicker } from './date-picker';

interface DateTimePickerProps {
  value?: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  placeholder?: string;
  disablePortal?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY hh:mm aa',
  disablePortal = false,
}: DateTimePickerProps) {
  const dateValue = React.useMemo(
    () => (value ? value.toDate() : null),
    [value?.valueOf()],
  );

  const handleDateChange = React.useCallback(
    // 1. Update the type to accept Date[] (to satisfy the DatePicker prop definition)
    (date: Date | Date[] | null) => {
      let normalizedDate: Date | null = null;

      // 2. Check if it's an array (even if we only expect one date)
      if (Array.isArray(date)) {
        normalizedDate = date.length > 0 ? date[0] : null;
      } else if (date instanceof Date) {
        normalizedDate = date;
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
      disablePortal={disablePortal}
    />
  );
}
