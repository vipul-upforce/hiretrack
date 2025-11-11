"use client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface DateRangeFilterProps {
  createdAfter: string;
  createdBefore: string;
  setFieldValue: (field: string, value: any) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
}

export function DateRangeFilter({
  createdAfter,
  createdBefore,
  setFieldValue,
  hasError,
  getErrorMessage,
}: DateRangeFilterProps) {
  const toDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
      return !isNaN(dateValue.getTime()) ? dateValue : null;
    }

    if (dateValue && typeof dateValue.toDate === "function") {
      try {
        const date = dateValue.toDate();
        return !isNaN(date.getTime()) ? date : null;
      } catch (e) {
        return null;
      }
    }

    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date : null;
    }

    if (typeof dateValue === "number") {
      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date : null;
    }

    return null;
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Created Date Range</Label>
      <div className="space-y-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start text-left font-normal h-9 ${
                hasError("createdAfter") || hasError("createdBefore")
                  ? "border-destructive"
                  : ""
              }`}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {(() => {
                const afterDate = createdAfter?.trim()
                  ? new Date(createdAfter)
                  : null;
                const beforeDate = createdBefore?.trim()
                  ? new Date(createdBefore)
                  : null;

                const isValidAfter = afterDate && !isNaN(afterDate.getTime());
                const isValidBefore =
                  beforeDate && !isNaN(beforeDate.getTime());

                if (isValidAfter && isValidBefore) {
                  return (
                    <span>
                      {format(afterDate, "MMM dd")} -{" "}
                      {format(beforeDate, "MMM dd, yyyy")}
                    </span>
                  );
                } else if (isValidAfter) {
                  return <span>From {format(afterDate, "MMM dd, yyyy")}</span>;
                } else if (isValidBefore) {
                  return (
                    <span>Until {format(beforeDate, "MMM dd, yyyy")}</span>
                  );
                } else {
                  return (
                    <span className="text-muted-foreground">
                      Select date range
                    </span>
                  );
                }
              })()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <DatePicker
              value={(() => {
                const afterStr = createdAfter?.trim();
                const beforeStr = createdBefore?.trim();

                if (afterStr && beforeStr) {
                  try {
                    const afterDate = new Date(afterStr);
                    const beforeDate = new Date(beforeStr);

                    if (
                      !isNaN(afterDate.getTime()) &&
                      !isNaN(beforeDate.getTime())
                    ) {
                      return [afterDate, beforeDate];
                    }
                  } catch (e) {
                    // Invalid dates, return null
                  }
                }
                return null;
              })()}
              onChange={(dateRange) => {
                if (Array.isArray(dateRange) && dateRange.length === 2) {
                  const [startDate, endDate] = dateRange;
                  const start = toDate(startDate);
                  const end = toDate(endDate);

                  if (start) {
                    const startOfDay = new Date(start);
                    startOfDay.setHours(0, 0, 0, 0);
                    setFieldValue("createdAfter", startOfDay.toISOString());
                  } else {
                    setFieldValue("createdAfter", "");
                  }

                  if (end) {
                    const endOfDay = new Date(end);
                    endOfDay.setHours(23, 59, 59, 999);
                    setFieldValue("createdBefore", endOfDay.toISOString());
                  } else {
                    setFieldValue("createdBefore", "");
                  }
                } else {
                  setFieldValue("createdAfter", "");
                  setFieldValue("createdBefore", "");
                }
              }}
              range={true}
              showTimePicker={false}
              format="MM/DD/YYYY"
              placeholder="Select date range"
            />
          </PopoverContent>
        </Popover>
        {(hasError("createdAfter") || hasError("createdBefore")) && (
          <p className="text-xs text-destructive">
            {getErrorMessage("createdAfter") ||
              getErrorMessage("createdBefore")}
          </p>
        )}
      </div>
    </div>
  );
}
