'use client';

import * as React from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { DateObject } from 'react-multi-date-picker';
import { DatePicker } from './date-picker';

interface DateTimePickerProps {
  value?: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  placeholder?: string;
  disablePortal?: boolean;
  portalContainer?: HTMLElement | null;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY hh:mm aa',
  disablePortal = false,
  portalContainer,
}: DateTimePickerProps) {
  const dateValue = React.useMemo(
    () => (value ? value.toDate() : null),
    [value?.valueOf()],
  );

  const handleDateChange = React.useCallback(
    (date: Date | DateObject | Date[] | DateObject[] | null) => {
      let normalizedDate: Date | null = null;

      if (!date) {
        normalizedDate = null;
      }

      else if (Array.isArray(date)) {
        const first = date[0];

        if (!first) normalizedDate = null;
        else if (first instanceof Date) normalizedDate = first;
        else if ("toDate" in first) normalizedDate = first.toDate();
      }

      else if (date instanceof Date) {
        normalizedDate = date;
      }

      else if ("toDate" in date) {
        normalizedDate = date.toDate();
      }

      const newDayjsValue =
        normalizedDate && !Number.isNaN(normalizedDate.getTime())
          ? dayjs(normalizedDate)
          : null;

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
      onChange={(date) => handleDateChange(date)}
      placeholder={placeholder}
      showTimePicker
      showNowButton
      timePickerPosition="right"
      format="MM/DD/YYYY hh:mm A"
      disablePortal={disablePortal}
      portalContainer={portalContainer}
    />
  );
}
