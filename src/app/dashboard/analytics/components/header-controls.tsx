"use client";
import { Button } from "@/components/ui/button";
import { DownloadIcon, RefreshCcwIcon } from "lucide-react";
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
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-wrap gap-2">
        <DatePicker
          value={dateRange}
          onChange={onDateRangeChange}
          range={true}
          showTimePicker={false}
          format="MM/DD/YYYY"
          placeholder="Select date range"
          className="w-[240px]"
        />
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
