import { format, isValid } from "date-fns";

// src/utils/dateUtils.ts
export const formatDate = (dateString: string | Date | undefined) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (!isValid(date)) return "Invalid date";
  return format(date, "PPP");
};

export const formatTime = (timeString: string | Date | undefined) => {
  if (!timeString) return "N/A";
  const time = new Date(timeString);
  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
};
