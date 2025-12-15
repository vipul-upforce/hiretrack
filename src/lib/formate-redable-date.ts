export type DateFormatMode =
  | 'auto'
  | 'relative'
  | 'friendly'
  | 'full'
  | 'smart-relative';

/**
 * Converts any valid date string or Date object into a human-readable format
 * based on the selected mode.
 *
 * @remarks
 * Handles invalid dates gracefully by returning `"-"`.
 *
 * @param date - The date value to convert. Accepts `Date` objects, ISO strings, `null`, or `undefined`.
 * @param mode - (Optional) The formatting strategy to use. Defaults to `"auto"`.
 *
 * @returns A string representing the formatted date.
 *
 * @example
 * // 1. Standard Usage (Auto Mode)
 * formatReadableDate(new Date()); // "Just now"
 * formatReadableDate(new Date(Date.now() - 1000 * 60 * 60 * 5)); // "5h ago"
 * formatReadableDate("2023-12-25"); // "December 25, 2023" (if older than this year)
 *
 * @example
 * // 2. Relative Mode (Strictly elapsed time)
 * formatReadableDate(threeDaysAgo, "relative"); // "3 days ago"
 * formatReadableDate(twoMonthsAgo, "relative"); // "2 months ago"
 *
 * @example
 * // 3. Friendly Mode (Calendar based)
 * formatReadableDate(yesterday, "friendly"); // "Yesterday"
 * formatReadableDate(lastFriday, "friendly"); // "Last Friday"
 *
 * @example
 * // 4. Smart-Relative (Social Media style)
 * formatReadableDate(twoHoursAgo, "smart-relative"); // "2h ago"
 * formatReadableDate(twoMonthsAgo, "smart-relative"); // "January 15, 2024"
 *
 * @example
 * // 5. Full Format
 * formatReadableDate(new Date(), "full"); // "February 10, 2025 at 3:42 PM"
 */
export function formatReadableDate(
  date: string | Date | null | undefined,
  mode: DateFormatMode = 'auto',
): string {
  if (!date) return '-';

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();

  // Time unit conversions
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // MODE: Full (Absolute)
  if (mode === 'full') {
    return (
      `${parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      } at ${parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    );
  }

  // MODE: Smart Relative (Short relative < 1 month, then Date)
  if (mode === 'smart-relative') {
    if (diffMonths >= 1) {
      return parsed.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }

    // Fallback to short relative rules
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${diffWeeks}w ago`;
  }

  // MODE: Relative (Verbose elapsed time)
  if (mode === 'relative') {
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    // Note: Logic specifically prioritizes Days over Weeks if under 30 days
    if (diffDays < 30) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    if (diffWeeks < 4) return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
    if (diffMonths < 12) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  }

  // Helper for Friendly/Auto logic
  const friendlyMode = () => {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return `Last ${parsed.toLocaleDateString('en-US', { weekday: 'long' })}`;
    }
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;

    // Current year: "October 12"
    if (diffDays < 365) {
      return parsed.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
      });
    }

    // Older: "October 12, 2023"
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // MODE: Auto (Hybrid)
  if (mode === 'auto') {
    if (diffHours < 24) {
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      return `${diffHours}h ago`;
    }
    return friendlyMode();
  }

  // Default fallback (Friendly)
  return friendlyMode();
}
