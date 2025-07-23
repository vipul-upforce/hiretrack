"use client";

import * as React from "react";
import { DatePicker } from "./date-picker";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

export function DateTimePicker({
  value,
  onChange,
  onBlur,
  placeholder = "MM/DD/YYYY hh:mm aa",
  allowClear = true,
}: {
  value?: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  // Convert Dayjs to Date for the new DatePicker
  const dateValue = value ? value.toDate() : null;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      onChange(dayjs(date));
    } else {
      onChange(null);
    }
    onBlur?.();
  };

  return (
    <DatePicker
      value={dateValue}
      onChange={handleDateChange}
      placeholder={placeholder}
      showTimePicker={true}
      showNowButton={true}
      timePickerPosition="right"
      format="MM/DD/YYYY hh:mm A"
    />
  );
}
