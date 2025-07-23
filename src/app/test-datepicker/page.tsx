"use client";

import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import dayjs from "dayjs";

// Helper function to safely convert any date value to a Date object
const safeDateToString = (dateValue: any): string => {
  if (!dateValue) return "None";

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString();
    }

    // If it's a string, try to convert to Date
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    // If it's a Date object from the library (has toDate method)
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleDateString();
    }

    // If it's a Date object from the library (has format method)
    if (dateValue && typeof dateValue.format === "function") {
      return dateValue.format("MM/DD/YYYY");
    }

    // Fallback: try to convert to string
    return String(dateValue);
  } catch (error) {
    return "Invalid date";
  }
};

// Helper function to safely convert any date value to a string for display
const safeDateToLocaleString = (dateValue: any): string => {
  if (!dateValue) return "None";

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleString();
    }

    // If it's a string, try to convert to Date
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }

    // If it's a Date object from the library (has toDate method)
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleString();
    }

    // If it's a Date object from the library (has format method)
    if (dateValue && typeof dateValue.format === "function") {
      return dateValue.format("MM/DD/YYYY HH:mm");
    }

    // Fallback: try to convert to string
    return String(dateValue);
  } catch (error) {
    return "Invalid date";
  }
};

export default function TestDatePickerPage() {
  const [date, setDate] = useState<Date | null>(null);
  const [dateTime, setDateTime] = useState<dayjs.Dayjs | null>(null);
  const [dateOnly, setDateOnly] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [customFormat, setCustomFormat] = useState<Date | null>(null);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">DatePicker Test Page</h1>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            Date & Time Picker (Default)
          </h2>
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Select date and time"
          />
          <p className="text-sm text-muted-foreground">
            Selected: {safeDateToLocaleString(date)}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Date Only Picker</h2>
          <DatePicker
            value={dateOnly}
            onChange={setDateOnly}
            showTimePicker={false}
            format="MM/DD/YYYY"
            placeholder="Select date only"
          />
          <p className="text-sm text-muted-foreground">
            Selected: {safeDateToString(dateOnly)}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Date Range Picker</h2>
          <DatePicker
            value={dateRange}
            onChange={setDateRange}
            range={true}
            format="MM/DD/YYYY"
            placeholder="Select date range"
          />
          <p className="text-sm text-muted-foreground">
            Selected:{" "}
            {dateRange && dateRange[0] && dateRange[1]
              ? `${safeDateToString(dateRange[0])} - ${safeDateToString(dateRange[1])}`
              : "None"}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Custom Format Picker</h2>
          <DatePicker
            value={customFormat}
            onChange={setCustomFormat}
            format="MMMM DD, YYYY HH:mm"
            placeholder="Select with custom format"
          />
          <p className="text-sm text-muted-foreground">
            Selected: {safeDateToLocaleString(customFormat)}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            DateTimePicker (Legacy Compatibility)
          </h2>
          <DateTimePicker
            value={dateTime}
            onChange={setDateTime}
            placeholder="Select date and time (legacy)"
          />
          <p className="text-sm text-muted-foreground">
            Selected: {dateTime ? dateTime.format("MM/DD/YYYY HH:mm") : "None"}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Disabled Picker</h2>
          <DatePicker
            value={date}
            onChange={setDate}
            disabled={true}
            placeholder="Disabled picker"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Time Picker on Left</h2>
          <DatePicker
            value={date}
            onChange={setDate}
            timePickerPosition="left"
            placeholder="Time picker on left"
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Without Now Button</h2>
          <DatePicker
            value={date}
            onChange={setDate}
            showNowButton={false}
            placeholder="Without Now button"
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Test Instructions:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Test each DatePicker variant above</li>
          <li>Check that Today, Now, Clear, and Done buttons work correctly</li>
          <li>Verify theme adaptation (light/dark mode)</li>
          <li>Test date range selection functionality</li>
          <li>Check custom format display</li>
          <li>Verify disabled state works</li>
          <li>Test time picker positioning</li>
          <li>Check that the legacy DateTimePicker still works</li>
          <li>Test the new Clear button functionality</li>
        </ul>
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Features to Test:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <strong>Theme Support:</strong> Switch between light/dark themes
          </li>
          <li>
            <strong>Custom Actions:</strong> Today, Now, Clear, and Done buttons
          </li>
          <li>
            <strong>Time Picker:</strong> Configurable position and visibility
          </li>
          <li>
            <strong>Date Range:</strong> Select start and end dates
          </li>
          <li>
            <strong>Custom Format:</strong> Different date format displays
          </li>
          <li>
            <strong>Clear Functionality:</strong> Clear button to reset
            selection
          </li>
          <li>
            <strong>Accessibility:</strong> Keyboard navigation and screen
            readers
          </li>
          <li>
            <strong>Responsive:</strong> Works on mobile and desktop
          </li>
        </ul>
      </div>
    </div>
  );
}
