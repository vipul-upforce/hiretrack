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
  portalContainer,
}: {
  value?: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  allowClear?: boolean;
  portalContainer?: HTMLElement | null;
}) {
  // Convert Dayjs to Date for the new DatePicker
  const dateValue = value ? value.toDate() : null;

  const handleDateChange = (date: any) => {
    let normalizedDate: Date | null = null;

    if (date && typeof date === "object") {
      if ("toDate" in date) {
        normalizedDate = date.toDate();
      } else if (date instanceof Date) {
        normalizedDate = date;
      }
    }

    if (normalizedDate && !isNaN(normalizedDate.getTime())) {
      onChange(dayjs(normalizedDate));
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
