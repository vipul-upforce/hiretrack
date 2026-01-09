/**
 * Cache utility functions for calendar data management
 */

import { CandidateAssignment } from '../page';

/**
 * Extracts the primary month from a date range (ignoring overflow days)
 * Uses the midpoint to determine which month is primarily being displayed
 */
export const getPrimaryMonthFromRange = (
  startDate: Date | string,
  endDate: Date | string,
): { year: number; month: number; monthStart: Date; monthEnd: Date } => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get the primary month from the midpoint (ignores overflow days)
  const midpoint = new Date((start.getTime() + end.getTime()) / 2);
  const primaryYear = midpoint.getFullYear();
  const primaryMonth = midpoint.getMonth();

  // Calculate month boundaries (1st to last day)
  const monthStart = new Date(primaryYear, primaryMonth, 1);
  const monthEnd = new Date(
    primaryYear,
    primaryMonth + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return { year: primaryYear, month: primaryMonth, monthStart, monthEnd };
};

/**
 * Checks if we have data in cache for the primary month of a date range
 * This ignores overflow days from adjacent months
 */
export const hasDataInCacheForPrimaryMonth = (
  startDate: Date | string,
  endDate: Date | string,
  cache: Map<string, CandidateAssignment>,
): boolean => {
  const { monthStart, monthEnd } = getPrimaryMonthFromRange(startDate, endDate);

  // Check if we have data for this specific month (1st to last day)
  return Array.from(cache.values()).some((a) => {
    if (!a.assignment?.time) return false;
    const time = new Date(a.assignment.time);
    return time >= monthStart && time <= monthEnd;
  });
};

/**
 * Checks if an assignment's time falls within a date range
 */
export const isWithinDateRange = (
  assignmentTime: string | undefined,
  dateRange: { startDate: Date; endDate: Date },
): boolean => {
  if (!assignmentTime) return false;
  const time = new Date(assignmentTime);
  return time >= dateRange.startDate && time <= dateRange.endDate;
};

/**
 * Filters assignments by date range
 */
export const filterAssignmentsByDateRange = (
  assignments: CandidateAssignment[],
  startDate: Date | string,
  endDate: Date | string,
): CandidateAssignment[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return assignments.filter((a) => {
    if (!a.assignment?.time) return false;
    const time = new Date(a.assignment.time);
    return time >= start && time <= end;
  });
};
