"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, RefreshCcwIcon, CalendarIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

interface HeaderControlsProps {
  dateRange: Date[] | null;
  onDateRangeChange: (range: Date[] | null) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
  isExporting: boolean;
}

export function HeaderControls({
  dateRange,
  onDateRangeChange,
  onRefresh,
  onExport,
  isRefreshing,
  isExporting,
}: HeaderControlsProps) {
  // Local temp state while user is interacting with the picker
  const [showPicker, setShowPicker] = useState(false);
  const [tempRange, setTempRange] = useState<Date[] | null>(dateRange);

  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  const handleOpenPicker = () => {
    setTempRange(dateRange); // load existing range into temp
    setShowPicker(true);
  };

  const handleCancel = () => {
    setTempRange(dateRange); // revert any temp selection
    setShowPicker(false);
  };

  const handleDone = () => {
    // only apply if both dates are present (for range)
    if (
      !tempRange ||
      tempRange.length !== 2 ||
      !tempRange[0] ||
      !tempRange[1]
    ) {
      setShowPicker(false);
      return;
    }

    // Apply final selection to parent (this is the single moment parent updates and triggers API)
    onDateRangeChange(tempRange);
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-wrap gap-2 relative">
        {/* Trigger / display button */}
        {!showPicker ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPicker}
            className="flex items-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>
              {dateRange && dateRange.length === 2
                ? `${new Date(dateRange[0]).toLocaleDateString()} - ${new Date(
                    dateRange[1]
                  ).toLocaleDateString()}`
                : "Select date range"}
            </span>
          </Button>
        ) : (
          // Inline controlled picker box (keeps open until Done/Cancel)
          <div className="p-3 border rounded-md bg-card text-card-foreground shadow-md flex flex-col gap-3 z-10">
            <DatePicker
              value={tempRange}
              onChange={(newRange) => {
                setTempRange(newRange);
              }}
              range={true}
              showTimePicker={false}
              format="MM/DD/YYYY"
              placeholder="Select date range"
              className="w-[260px]"
            />

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>

              <Button variant="default" size="sm" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcwIcon
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}
