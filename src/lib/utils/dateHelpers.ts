/**
 * Parses GMT offset string to milliseconds
 * @param offset - GMT offset string (e.g., "GMT+05:30", "GMT-08:00")
 * @returns Offset in milliseconds
 */
export function parseGMTOffset(offset: string | undefined | null): number {
  if (!offset || offset === "GMT+00:00") return 0;
  const sign = offset.startsWith("GMT+") ? 1 : -1;
  const [hours, minutes] = offset
    .replace("GMT+", "")
    .replace("GMT-", "")
    .split(":")
    .map(Number);
  return sign * (hours * 60 * 60 * 1000 + minutes * 60 * 1000);
}

/**
 * Calculates timezone-aware dates for today and current week
 * @param timeZoneOffset - Timezone offset in milliseconds
 * @returns Object with UTC dates for today and week boundaries
 */
export function getTimeZoneDates(timeZoneOffset: number) {
  const now = new Date();
  const nowInUserTimeZone = new Date(now.getTime() + timeZoneOffset);

  // Start and end of today in user's timezone
  const startOfToday = new Date(
    nowInUserTimeZone.getFullYear(),
    nowInUserTimeZone.getMonth(),
    nowInUserTimeZone.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfToday = new Date(
    nowInUserTimeZone.getFullYear(),
    nowInUserTimeZone.getMonth(),
    nowInUserTimeZone.getDate(),
    23,
    59,
    59,
    999
  );

  // Convert to UTC for database queries
  const startOfTodayUTC = new Date(startOfToday.getTime() - timeZoneOffset);
  const endOfTodayUTC = new Date(endOfToday.getTime() - timeZoneOffset);

  // Start and end of week (Sunday to Saturday) in user's timezone
  const dayOfWeek = nowInUserTimeZone.getDay(); // 0 for Sunday, ..., 6 for Saturday
  const startOfWeek = new Date(
    nowInUserTimeZone.getFullYear(),
    nowInUserTimeZone.getMonth(),
    nowInUserTimeZone.getDate() - dayOfWeek,
    0,
    0,
    0,
    0
  );
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 6,
    23,
    59,
    59,
    999
  );

  // Convert to UTC for database queries
  const startOfWeekUTC = new Date(startOfWeek.getTime() - timeZoneOffset);
  const endOfWeekUTC = new Date(endOfWeek.getTime() - timeZoneOffset);

  return {
    startOfTodayUTC,
    endOfTodayUTC,
    startOfWeekUTC,
    endOfWeekUTC,
  };
}

