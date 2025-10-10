"use client";

import { Badge } from "@/components/ui/badge";

export type StatusFilterValue = "draft" | "open" | "closed";
export type DateFilterValue = "today" | "week" | "month" | "quarter";
export type SortOption = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "candidates-desc" | "candidates-asc";

interface JobsFiltersProps {
  statusFilters: StatusFilterValue[];
  dateFilters: DateFilterValue[];
  onStatusFilterChange: (value: StatusFilterValue[]) => void;
  onDateFilterChange: (value: DateFilterValue[]) => void;
}

export function JobsFilters({
  statusFilters,
  dateFilters,
  onStatusFilterChange,
  onDateFilterChange,
}: JobsFiltersProps) {
  const handleStatusToggle = (value: StatusFilterValue) => {
    const newFilters = statusFilters.includes(value)
      ? statusFilters.filter((f) => f !== value)
      : [...statusFilters, value];
    onStatusFilterChange(newFilters);
  };

  const handleDateToggle = (value: DateFilterValue) => {
    const newFilters = dateFilters.includes(value)
      ? dateFilters.filter((f) => f !== value)
      : [...dateFilters, value];
    onDateFilterChange(newFilters);
  };

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Status:
        </span>
        <div className="flex items-center gap-2">
          <Badge
            variant={statusFilters.includes("draft") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleStatusToggle("draft")}
          >
            Draft
          </Badge>
          <Badge
            variant={statusFilters.includes("open") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleStatusToggle("open")}
          >
            Open
          </Badge>
          <Badge
            variant={statusFilters.includes("closed") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleStatusToggle("closed")}
          >
            Closed
          </Badge>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Posted:
        </span>
        <div className="flex items-center gap-2">
          <Badge
            variant={dateFilters.includes("today") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleDateToggle("today")}
          >
            Today
          </Badge>
          <Badge
            variant={dateFilters.includes("week") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleDateToggle("week")}
          >
            This Week
          </Badge>
          <Badge
            variant={dateFilters.includes("month") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleDateToggle("month")}
          >
            This Month
          </Badge>
          <Badge
            variant={dateFilters.includes("quarter") ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
            onClick={() => handleDateToggle("quarter")}
          >
            This Quarter
          </Badge>
        </div>
      </div>
    </div>
  );
}
