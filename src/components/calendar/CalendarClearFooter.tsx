import React from "react";
import { Button } from "@/components/ui/button";

interface CalendarClearFooterProps {
  value: string;
  onClear: () => void;
}

export const CalendarClearFooter: React.FC<CalendarClearFooterProps> = ({
  value,
  onClear,
}) => {
  if (!value) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-2 text-red-500"
      onClick={onClear}
    >
      Clear
    </Button>
  );
};
