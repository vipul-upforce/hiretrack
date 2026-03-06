'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import { useFetchAssignedCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import { CandidateAssignment, CustomCalendarEvent } from '../page';
import {
  CalendarViewType,
  ApiViewType,
  calculateDateRange,
} from '../utils/dateRangeUtils';
import { createSSETransformer } from '../utils/eventTransformers';
import {
  getPrimaryMonthFromRange,
  hasValidAssignment,
} from '../utils/cacheUtils';
import { UseCalendarReturn } from '../types';
import { useCalendarDerived } from './useCalendarDerived';
import { useCalendarHandlers } from './useCalendarHandlers';

/**
 * Module-level Set to track candidate IDs that have been removed via SSE.
 * This persists across component unmounts/remounts but resets on page refresh.
 * Used to filter out removed candidates from RTK Query cache data.
 */
const removedCandidateIds = new Set<string>();

/**
 * Custom hook for managing calendar functionality.
 * Handles all state, API calls, filtering, event creation, and business logic for the calendar.
 * Implements date-based pagination for efficient loading of calendar events.
 *
 * @returns All state, handlers, and computed values needed by the calendar component
 */
export function useCalendar(): UseCalendarReturn {
  const [selectedEvent, setSelectedEvent] = useState<
    CustomCalendarEvent | Candidate | null
  >(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] =
    useState<CalendarViewType>('dayGridMonth');

  // ===== FULL CALENDAR STATE =====
  // Query params for Full calendar (controlled by FC navigation)
  const [fcQueryParams, setFcQueryParams] = useState<{
    startDate: string;
    endDate: string;
    view: ApiViewType;
    filterValue: string | undefined;
  }>(() => {
    const initialRange = calculateDateRange('dayGridMonth', new Date());
    return {
      startDate: initialRange.startDate.toISOString(),
      endDate: initialRange.endDate.toISOString(),
      view: 'month',
      filterValue: undefined,
    };
  });

  // ===== QUICK NAV STATE =====
  // Query params for Quick nav (controlled by mini calendar navigation)
  const [qnQueryParams, setQnQueryParams] = useState<{
    startDate: string;
    endDate: string;
    view: ApiViewType;
    filterValue: string | undefined;
  }>(() => {
    const initialRange = calculateDateRange('dayGridMonth', new Date());
    return {
      startDate: initialRange.startDate.toISOString(),
      endDate: initialRange.endDate.toISOString(),
      view: 'month',
      filterValue: undefined,
    };
  });

  // Track the current date range for SSE filtering (uses FC's range)
  const [dateRange, setDateRange] = useState(() =>
    calculateDateRange('dayGridMonth', new Date()),
  );

  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || '';

  // Track if we've ever loaded data (for initial skeleton only)
  const hasLoadedOnce = useRef(false);
  // Track if initial refetch has been done (for fresh data on page load)
  const hasRefetchedOnMount = useRef(false);

  // ===== SHARED DATA CACHE =====
  // Stores all assignments ever fetched, keyed by ID
  // Both Full calendar and Quick nav contribute to and read from this cache
  const [sharedCache, setSharedCache] = useState<
    Map<string, CandidateAssignment>
  >(new Map());

  // Track months that have been properly loaded from API (not SSE)
  // Format: "YYYY-MM" (e.g., "2026-01" for January 2026)
  const [apiLoadedMonths, setApiLoadedMonths] = useState<Set<string>>(
    new Set(),
  );

  /**
   * Check if the primary month has been loaded from API.
   * This is separate from cache data because SSE updates can add data to cache
   * for months that haven't been fetched from API yet, which would incorrectly
   * skip the API fetch when navigating to that month.
   */
  const hasDataInCache = useMemo(() => {
    const { year, month } = getPrimaryMonthFromRange(
      fcQueryParams.startDate,
      fcQueryParams.endDate,
    );
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    return apiLoadedMonths.has(monthKey);
  }, [apiLoadedMonths, fcQueryParams.startDate, fcQueryParams.endDate]);

  const {
    currentData: fcAssignments,
    isLoading: fcIsLoading,
    isFetching: fcIsFetching,
    refetch: fcRefetch,
  } = useFetchAssignedCandidatesQuery(fcQueryParams, {
    skip: hasDataInCache,
  });

  const { currentData: qnAssignments } =
    useFetchAssignedCandidatesQuery(qnQueryParams);

  useEffect(() => {
    if (!hasRefetchedOnMount.current) {
      hasRefetchedOnMount.current = true;
      fcRefetch();
    }
  }, [fcRefetch]);

  useEffect(() => {
    if (fcAssignments && fcAssignments[0]?.data) {
      const { year, month } = getPrimaryMonthFromRange(
        fcQueryParams.startDate,
        fcQueryParams.endDate,
      );
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      setApiLoadedMonths((prev) => {
        if (prev.has(monthKey)) return prev;
        const newSet = new Set(prev);
        newSet.add(monthKey);
        return newSet;
      });

      setSharedCache((prev) => {
        const newCache = new Map(prev);
        fcAssignments[0].data.forEach((a: CandidateAssignment) => {
          if (!removedCandidateIds.has(a._id)) {
            newCache.set(a._id, a);
          }
        });
        return newCache;
      });
    }
  }, [fcAssignments, fcQueryParams.startDate, fcQueryParams.endDate]);

  useEffect(() => {
    if (qnAssignments && qnAssignments[0]?.data) {
      const { year, month } = getPrimaryMonthFromRange(
        qnQueryParams.startDate,
        qnQueryParams.endDate,
      );
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      setApiLoadedMonths((prev) => {
        if (prev.has(monthKey)) return prev;
        const newSet = new Set(prev);
        newSet.add(monthKey);
        return newSet;
      });

      setSharedCache((prev) => {
        const newCache = new Map(prev);
        qnAssignments[0].data.forEach((a: CandidateAssignment) => {
          if (!removedCandidateIds.has(a._id)) {
            newCache.set(a._id, a);
          }
        });
        return newCache;
      });
    }
  }, [qnAssignments, qnQueryParams.startDate, qnQueryParams.endDate]);

  useEffect(() => {
    if (fcAssignments && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
    }
  }, [fcAssignments]);

  const isInitialLoading = fcIsLoading && !hasLoadedOnce.current;

  const refetch = useCallback(() => {
    fcRefetch();
  }, [fcRefetch]);

  // SSE transformer - creates function to transform candidate updates to calendar events
  const transformCandidateToEvent = useMemo(() => createSSETransformer(), []);

  const { candidates: sseCandidates } = useSSE<CustomCalendarEvent>(
    setSelectedEvent,
    selectedEvent && 'extendedProps' in selectedEvent
      ? (selectedEvent as CustomCalendarEvent)
      : null,
    undefined,
    transformCandidateToEvent,
  );

  // Sync SSE updates to sharedCache and track removed IDs
  // - When SSE indicates a candidate should be removed (assignment is null or invalid),
  //   we add its ID to the module-level removedCandidateIds Set
  // - This Set persists across component remounts, preventing removed candidates from reappearing
  // - When SSE indicates a valid update, we update the cache and remove the ID from the removed set
  useEffect(() => {
    if (sseCandidates.length === 0) return;

    // Collect candidates to remove and update
    const candidatesToRemove: string[] = [];
    const candidatesToUpdate: CandidateAssignment[] = [];

    sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
      if (!hasValidAssignment(sseCandidate)) {
        candidatesToRemove.push(sseCandidate._id);
        removedCandidateIds.add(sseCandidate._id);
      } else {
        candidatesToUpdate.push(sseCandidate);
        removedCandidateIds.delete(sseCandidate._id);
      }
    });

    // Update sharedCache (component-level cache)
    if (candidatesToRemove.length > 0 || candidatesToUpdate.length > 0) {
      setSharedCache((prev) => {
        const newCache = new Map(prev);
        let hasChanges = false;

        // Remove invalid candidates
        candidatesToRemove.forEach((id) => {
          if (newCache.has(id)) {
            newCache.delete(id);
            hasChanges = true;
          }
        });

        // Update valid candidates (only if already in cache)
        candidatesToUpdate.forEach((candidate) => {
          if (newCache.has(candidate._id)) {
            newCache.set(candidate._id, candidate);
            hasChanges = true;
          }
        });

        return hasChanges ? newCache : prev;
      });
    }
  }, [sseCandidates]);

  // Clear selected event when dialog closes
  useEffect(() => {
    if (!isDetailsOpen) {
      setSelectedEvent(null);
    }
  }, [isDetailsOpen]);

  const derived = useCalendarDerived({
    sharedCache,
    fcQueryParams,
    qnQueryParams,
    sseCandidates,
    dateRange,
    role,
    user,
    filterText,
    calendarView,
  });

  const handlers = useCalendarHandlers({
    setSelectedEvent,
    setIsDetailsOpen,
    calendarRef,
    searchText,
    setSearchText,
    setFilterText,
    setFcQueryParams,
    setQnQueryParams,
    setDateRange,
    setSelectedDate,
    setCalendarView,
    events: derived.events,
    selectedDate,
    refetch,
  });

  return {
    selectedEvent,
    setSelectedEvent,
    isDetailsOpen,
    setIsDetailsOpen,
    calendarRef,
    searchText,
    setSearchText,
    filterText,
    setFilterText,
    selectedDate,
    setSelectedDate,
    calendarView,
    setCalendarView,
    isLoading: fcIsLoading || fcIsFetching,
    isInitialLoading,
    refetch,
    user,
    role,
    dateRange,
    events: derived.events,
    qnEventDates: derived.qnEventDates,
    todayCount: derived.todayCount,
    thisWeekCount: derived.thisWeekCount,
    totalInterviews: derived.totalInterviews,
    upcomingCount: derived.upcomingCount,
    applyFilter: handlers.applyFilter,
    handleEventClick: handlers.handleEventClick,
    handleSidebarEventClick: handlers.handleSidebarEventClick,
    handleDateClick: handlers.handleDateClick,
    handleDateSelect: handlers.handleDateSelect,
    handleViewChange: handlers.handleViewChange,
    handleDatesSet: handlers.handleDatesSet,
    handleUpdate: handlers.handleUpdate,
  };
}
