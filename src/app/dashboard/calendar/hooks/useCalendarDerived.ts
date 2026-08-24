'use client';

import { useMemo, useCallback } from 'react';
import { CandidateAssignment, CustomCalendarEvent } from '../page';
import {
  filterAssignmentsByDateRange,
  isWithinDateRange as isWithinDateRangeUtil,
} from '../utils/cacheUtils';
import { transformAssignmentToEvent } from '../utils/eventTransformers';
import {
  getTodayMidnight,
  calculateTodayCount,
  calculateThisWeekCount,
  calculateUpcomingCount,
} from '../utils/calendarStats';
import { CalendarViewType } from '../utils/dateRangeUtils';

export interface UseCalendarDerivedParams {
  sharedCache: Map<string, CandidateAssignment>;
  fcQueryParams: { startDate: string; endDate: string };
  qnQueryParams: { startDate: string; endDate: string };
  sseCandidates: CandidateAssignment[];
  dateRange: { startDate: Date; endDate: Date };
  role: string;
  user: { id?: string } | null;
  filterText: string;
  calendarView: CalendarViewType;
}

export interface UseCalendarDerivedReturn {
  events: CustomCalendarEvent[];
  calendarEvents: CustomCalendarEvent[];
  qnEventDates: Date[];
  isWithinDateRange: (assignmentTime: string | undefined) => boolean;
  todayCount: number;
  thisWeekCount: number;
  upcomingCount: number;
  totalInterviews: number;
}

/** Escape special regex characters in a string for use in RegExp */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hook that computes calendar-derived data: cached/merged assignments,
 * filtered events, quick-nav dates, and stats.
 */
export function useCalendarDerived(
  params: UseCalendarDerivedParams,
): UseCalendarDerivedReturn {
  const {
    sharedCache,
    fcQueryParams,
    qnQueryParams,
    sseCandidates,
    dateRange,
    role,
    user,
    filterText,
    calendarView,
  } = params;

  const isWithinDateRange = useCallback(
    (assignmentTime: string | undefined): boolean =>
      isWithinDateRangeUtil(assignmentTime, dateRange),
    [dateRange],
  );

  const sseUpdatesMap = useMemo(
    () => new Map(sseCandidates.map((c: CandidateAssignment) => [c._id, c])),
    [sseCandidates],
  );

  const fcCachedAssignments = useMemo(
    () =>
      filterAssignmentsByDateRange(
        Array.from(sharedCache.values()),
        fcQueryParams.startDate,
        fcQueryParams.endDate,
      ),
    [sharedCache, fcQueryParams.startDate, fcQueryParams.endDate],
  );

  const mergedAssignments = useMemo(() => {
    const baseAssignments = [...fcCachedAssignments];

    const merged = baseAssignments
      .map((assignment: CandidateAssignment) => {
        const sseUpdate = sseUpdatesMap.get(assignment._id);

        if (sseUpdate) {
          if (!isWithinDateRange(sseUpdate.assignment?.time)) return null;

          if (role === 'interviewer') {
            const interviewerId =
              typeof sseUpdate.assignment?.interviewerId === 'object'
                ? sseUpdate.assignment?.interviewerId?._id
                : sseUpdate.assignment?.interviewerId;

            if (interviewerId === user?.id) return sseUpdate;
            return null;
          }
          return sseUpdate;
        }

        return assignment;
      })
      .filter(Boolean) as CandidateAssignment[];

    sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
      const existsInDb = baseAssignments.some(
        (a: CandidateAssignment) => a._id === sseCandidate._id,
      );

      if (!existsInDb) {
        if (!isWithinDateRange(sseCandidate.assignment?.time)) return;

        if (role === 'interviewer') {
          const interviewerId =
            typeof sseCandidate.assignment?.interviewerId === 'object'
              ? sseCandidate.assignment?.interviewerId?._id
              : sseCandidate.assignment?.interviewerId;

          if (interviewerId === user?.id) merged.push(sseCandidate);
        } else {
          merged.push(sseCandidate);
        }
      }
    });

    return merged;
  }, [
    fcCachedAssignments,
    sseUpdatesMap,
    sseCandidates,
    role,
    user,
    isWithinDateRange,
  ]);

  const mergedAllAssignments = useMemo(() => {
    const baseAssignments = Array.from(sharedCache.values());

    const merged = baseAssignments
      .map((assignment: CandidateAssignment) => {
        const sseUpdate = sseUpdatesMap.get(assignment._id);

        if (sseUpdate) {
          if (role === 'interviewer') {
            const interviewerId =
              typeof sseUpdate.assignment?.interviewerId === 'object'
                ? sseUpdate.assignment?.interviewerId?._id
                : sseUpdate.assignment?.interviewerId;

            if (interviewerId === user?.id) return sseUpdate;
            return null;
          }
          return sseUpdate;
        }

        return assignment;
      })
      .filter(Boolean) as CandidateAssignment[];

    sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
      const existsInDb = baseAssignments.some(
        (a: CandidateAssignment) => a._id === sseCandidate._id,
      );

      if (!existsInDb) {
        if (role === 'interviewer') {
          const interviewerId =
            typeof sseCandidate.assignment?.interviewerId === 'object'
              ? sseCandidate.assignment?.interviewerId?._id
              : sseCandidate.assignment?.interviewerId;

          if (interviewerId === user?.id) merged.push(sseCandidate);
        } else {
          merged.push(sseCandidate);
        }
      }
    });

    return merged;
  }, [sharedCache, sseUpdatesMap, sseCandidates, role, user]);

  const applyFilters = useCallback(
    (assignments: CandidateAssignment[]) =>
      assignments.filter((assignment: CandidateAssignment) => {
        if (role === 'interviewer') {
          const interviewerId =
            typeof assignment?.assignment?.interviewerId === 'object'
              ? assignment?.assignment?.interviewerId?._id
              : assignment?.assignment?.interviewerId;
          if (
            !assignment?.assignment ||
            interviewerId !== user?.id ||
            !interviewerId
          ) {
            return false;
          }
        }

        if (!filterText) return true;
        const escaped = escapeRegExp(filterText);
        // Safe: filterText is escaped to prevent ReDoS; dynamic pattern required for search
        // eslint-disable-next-line security/detect-non-literal-regexp -- user input escaped above
        const searchRegex = new RegExp(escaped, 'i');

        const jobSkills =
          (typeof assignment.jobId === 'object' && assignment.jobId?.skills) ||
          [];
        const assignmentSkills = assignment.skills || [];
        const allSkills = [...jobSkills, ...assignmentSkills];

        return (
          searchRegex.test(assignment.name || '') ||
          searchRegex.test(
            assignment.jobId && typeof assignment.jobId === 'object'
              ? assignment.jobId.title
              : '',
          ) ||
          searchRegex.test(
            (typeof assignment?.assignment?.interviewerId === 'object' &&
              assignment?.assignment?.interviewerId?.name) ||
              '',
          ) ||
          (allSkills.length > 0 &&
            allSkills.some((skill) => searchRegex.test(skill || '')))
        );
      }),
    [role, user, filterText],
  );

  const filteredAssignments = useMemo(
    () => applyFilters(mergedAssignments),
    [mergedAssignments, applyFilters],
  );

  const filteredAllAssignments = useMemo(
    () => applyFilters(mergedAllAssignments),
    [mergedAllAssignments, applyFilters],
  );

  const calendarEvents: CustomCalendarEvent[] = useMemo(
    () =>
      filteredAssignments
        ?.map((candidate, index) =>
          transformAssignmentToEvent(candidate, index, calendarView),
        )
        .filter((event): event is CustomCalendarEvent => !!event) || [],
    [filteredAssignments, calendarView],
  );

  const events: CustomCalendarEvent[] = useMemo(
    () =>
      filteredAllAssignments
        ?.map((candidate, index) =>
          transformAssignmentToEvent(candidate, index, calendarView),
        )
        .filter((event): event is CustomCalendarEvent => !!event) || [],
    [filteredAllAssignments, calendarView],
  );

  const qnEventDates: Date[] = useMemo(() => {
    const filtered = filterAssignmentsByDateRange(
      Array.from(sharedCache.values()),
      qnQueryParams.startDate,
      qnQueryParams.endDate,
    );
    return filtered
      .filter((a) => a.assignment?.time)
      .map((a) => new Date(a.assignment!.time!));
  }, [sharedCache, qnQueryParams.startDate, qnQueryParams.endDate]);

  const today = useMemo(() => getTodayMidnight(), []);
  const todayCount = useMemo(
    () => calculateTodayCount(events, today),
    [events, today],
  );
  const thisWeekCount = useMemo(
    () => calculateThisWeekCount(events, today),
    [events, today],
  );
  const upcomingCount = useMemo(
    () => calculateUpcomingCount(events, today),
    [events, today],
  );
  const totalInterviews = events.length;

  return {
    events,
    calendarEvents,
    qnEventDates,
    isWithinDateRange,
    todayCount,
    thisWeekCount,
    upcomingCount,
    totalInterviews,
  };
}
