'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
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
  mapFCViewTypeToApiView,
  mapViewToApiView,
} from '../utils/dateRangeUtils';
import {
  calculateTodayCount,
  calculateThisWeekCount,
  calculateUpcomingCount,
  getTodayMidnight,
} from '../utils/calendarStats';
import {
  transformAssignmentToEvent,
  createSSETransformer,
} from '../utils/eventTransformers';
import {
  hasDataInCacheForPrimaryMonth,
  isWithinDateRange as isWithinDateRangeUtil,
  filterAssignmentsByDateRange,
  hasValidAssignment,
} from '../utils/cacheUtils';
import { UseCalendarReturn } from '../types';

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

  // Check if we have data in cache for the primary month (ignores overflow days)
  const hasDataInCache = useMemo(
    () =>
      hasDataInCacheForPrimaryMonth(
        fcQueryParams.startDate,
        fcQueryParams.endDate,
        sharedCache,
      ),
    [sharedCache, fcQueryParams.startDate, fcQueryParams.endDate],
  );
  // ===== FULL CALENDAR QUERY =====
  const {
    currentData: fcAssignments,
    isLoading: fcIsLoading,
    isFetching: fcIsFetching,
    refetch: fcRefetch,
  } = useFetchAssignedCandidatesQuery(fcQueryParams, {
    skip: hasDataInCache,
  });

  // ===== QUICK NAV QUERY =====
  // Quick nav loads silently - we don't use its loading states
  const { currentData: qnAssignments } =
    useFetchAssignedCandidatesQuery(qnQueryParams);

  // ===== TOTAL ASSIGNMENTS QUERY =====
  // Fetch total count of all active assignments (without date range filtering)
  // This gives us the organization-wide total, not just current month
  const { currentData: totalAssignmentsData } =
    useFetchAssignedCandidatesQuery(
      {
        filterValue: fcQueryParams.filterValue,
        // No startDate/endDate - this gets all assignments for the organization
      },
    );

  // Refetch once on page load to ensure fresh data
  useEffect(() => {
    if (!hasRefetchedOnMount.current) {
      hasRefetchedOnMount.current = true;
      fcRefetch();
    }
  }, [fcRefetch]);

  // Merge Full calendar data into shared cache
  // Filter out any candidates that were removed via SSE (tracked in removedCandidateIds)
  useEffect(() => {
    if (fcAssignments && fcAssignments[0]?.data) {
      setSharedCache((prev) => {
        const newCache = new Map(prev);
        fcAssignments[0].data.forEach((a: CandidateAssignment) => {
          // Skip candidates that were removed via SSE
          if (!removedCandidateIds.has(a._id)) {
            newCache.set(a._id, a);
          }
        });
        return newCache;
      });
    }
  }, [fcAssignments]);

  // Merge Quick nav data into shared cache
  // Filter out any candidates that were removed via SSE (tracked in removedCandidateIds)
  useEffect(() => {
    if (qnAssignments && qnAssignments[0]?.data) {
      setSharedCache((prev) => {
        const newCache = new Map(prev);
        qnAssignments[0].data.forEach((a: CandidateAssignment) => {
          // Skip candidates that were removed via SSE
          if (!removedCandidateIds.has(a._id)) {
            newCache.set(a._id, a);
          }
        });
        return newCache;
      });
    }
  }, [qnAssignments]);

  // Mark as loaded once we have data
  useEffect(() => {
    if (fcAssignments && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
    }
  }, [fcAssignments]);

  // Initial loading = loading and never had data before
  const isInitialLoading = fcIsLoading && !hasLoadedOnce.current;

  /**
   * Refetch Full calendar data (bypasses cache)
   */
  const refetch = useCallback(() => {
    fcRefetch();
  }, [fcRefetch]);

  // SSE transformer - creates function to transform candidate updates to calendar events
  const transformCandidateToEvent = useMemo(() => createSSETransformer(), []);

  const { candidates: sseCandidates } = useSSE<CustomCalendarEvent>(
    setSelectedEvent,
    // Only pass CustomCalendarEvent, filter out Candidate type
    selectedEvent && 'extendedProps' in selectedEvent
      ? (selectedEvent as CustomCalendarEvent)
      : null,
    undefined, // jobId not needed for calendar
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
        // Add to module-level Set for persistence across remounts
        removedCandidateIds.add(sseCandidate._id);
      } else {
        candidatesToUpdate.push(sseCandidate);
        // If this candidate was previously marked as removed but now has a valid assignment,
        // remove it from the removed set (e.g., reassigned)
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

  /**
   * Applies the search filter - updates both query params to trigger RTK Query
   */
  const applyFilter = useCallback(() => {
    const newFilter = searchText.trim();
    setFilterText(newFilter);
    // Update both Full calendar and Quick nav filters
    setFcQueryParams((prev) => ({
      ...prev,
      filterValue: newFilter || undefined,
    }));
    setQnQueryParams((prev) => ({
      ...prev,
      filterValue: newFilter || undefined,
    }));
  }, [searchText]);

  /**
   * Handles FullCalendar's datesSet event - called when calendar navigates
   * This is triggered on: initial render, prev/next navigation, view change, today button
   * Only updates Full calendar's query params (not Quick nav's)
   */
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const newStartDate = arg.start.toISOString();
    const newEndDate = arg.end.toISOString();
    const apiView = mapFCViewTypeToApiView(arg.view.type);
    const newView = arg.view.type as CalendarViewType;

    // Only update Full calendar's params (prevents unnecessary fetches)
    setFcQueryParams((prev) => {
      if (
        prev.startDate === newStartDate &&
        prev.endDate === newEndDate &&
        prev.view === apiView
      ) {
        return prev;
      }
      return {
        ...prev,
        startDate: newStartDate,
        endDate: newEndDate,
        view: apiView,
      };
    });

    // Update local state for SSE filtering and UI
    setDateRange({ startDate: arg.start, endDate: arg.end });
    setSelectedDate(arg.start);
    setCalendarView(newView);
  }, []);

  /**
   * Check if an assignment's time falls within the current date range
   */
  const isWithinDateRange = useCallback(
    (assignmentTime: string | undefined): boolean =>
      isWithinDateRangeUtil(assignmentTime, dateRange),
    [dateRange],
  );

  // Create SSE updates map
  const sseUpdatesMap = useMemo(
    () => new Map(sseCandidates.map((c: CandidateAssignment) => [c._id, c])),
    [sseCandidates],
  );

  // Get Full calendar assignments from shared cache, filtered by FC's date range
  const fcCachedAssignments = useMemo(
    () =>
      filterAssignmentsByDateRange(
        Array.from(sharedCache.values()),
        fcQueryParams.startDate,
        fcQueryParams.endDate,
      ),
    [sharedCache, fcQueryParams.startDate, fcQueryParams.endDate],
  );

  // Merge SSE updates with Full calendar assignments (from shared cache)
  const mergedAssignments = useMemo(() => {
    const baseAssignments = [...fcCachedAssignments];

    const merged = baseAssignments
      .map((assignment: CandidateAssignment) => {
        // Check if there's an SSE update for this assignment
        const sseUpdate = sseUpdatesMap.get(assignment._id);

        // If there's an SSE update, use it (it's fresher data)
        if (sseUpdate) {
          // Check if the updated time is within current date range
          if (!isWithinDateRange(sseUpdate.assignment?.time)) {
            // Assignment time moved outside date range, remove it
            return null;
          }

          // For interviewers, verify they're still assigned
          if (role === 'interviewer') {
            const interviewerId =
              typeof sseUpdate.assignment?.interviewerId === 'object'
                ? sseUpdate.assignment?.interviewerId?._id
                : sseUpdate.assignment?.interviewerId;

            // Only use SSE update if interviewer is still assigned
            if (interviewerId === user?.id) {
              return sseUpdate;
            }
            // If interviewer was unassigned via SSE, filter out later
            return null;
          }
          return sseUpdate;
        }

        // No SSE update? Keep original assignment
        return assignment;
      })
      .filter(Boolean) as CandidateAssignment[];

    // Add NEW assignments that came via SSE but aren't in DB yet
    sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
      const existsInDb = baseAssignments.some(
        (a: CandidateAssignment) => a._id === sseCandidate._id,
      );

      if (!existsInDb) {
        // Only add if within current date range
        if (!isWithinDateRange(sseCandidate.assignment?.time)) {
          return;
        }

        // For interviewers, only add if assigned to them
        if (role === 'interviewer') {
          const interviewerId =
            typeof sseCandidate.assignment?.interviewerId === 'object'
              ? sseCandidate.assignment?.interviewerId?._id
              : sseCandidate.assignment?.interviewerId;

          if (interviewerId === user?.id) {
            merged.push(sseCandidate);
          }
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

  // Filter assignments based on role and search text
  const filteredAssignments = useMemo(
    () =>
      mergedAssignments.filter((assignment: CandidateAssignment) => {
        // If the current role is interviewer, only include assignments assigned to the current interviewer
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
        const searchRegex = new RegExp(filterText, 'i');

        const jobSkills =
          (typeof assignment.jobId === 'object' && assignment.jobId?.skills) ||
          [];
        const assignmentSkills = assignment.skills || [];
        // const assignmentJobSkills =
        //   (typeof assignment.assignment?.jobId !== 'string' &&
        //     assignment.assignment?.jobId?.skills) ||
        //   [];
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
    [mergedAssignments, role, user, filterText],
  );

  // Create calendar events from filtered assignments using extracted transformer
  // These are for the Full calendar
  const events: CustomCalendarEvent[] = useMemo(
    () =>
      filteredAssignments
        ?.map((candidate, index) =>
          transformAssignmentToEvent(candidate, index, calendarView),
        )
        .filter((event): event is CustomCalendarEvent => !!event) || [],
    [filteredAssignments, calendarView],
  );

  // Create event dates for Quick nav (mini calendar dots)
  // Uses shared cache filtered by Quick nav's date range
  // Only include events with scheduled dates (exclude unscheduled candidates)
  const qnEventDates: Date[] = useMemo(() => {
    const filtered = filterAssignmentsByDateRange(
      Array.from(sharedCache.values()),
      qnQueryParams.startDate,
      qnQueryParams.endDate,
    );
    return filtered
      .filter((a) => a.assignment?.time) // Only include scheduled events for calendar dots
      .map((a) => new Date(a.assignment!.time!));
  }, [sharedCache, qnQueryParams.startDate, qnQueryParams.endDate]);

  /**
   * Handles event click from calendar
   */
  const handleEventClick = (arg: EventClickArg) => {
    const { event } = arg;
    if (event.extendedProps?.candidate && event.extendedProps?.interviewer) {
      const calendarEvent = event as unknown as CustomCalendarEvent;
      setSelectedEvent(calendarEvent);
      setIsDetailsOpen(true);
    }
  };

  /**
   * Handles event click from sidebar
   */
  const handleSidebarEventClick = (event: CustomCalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  /**
   * Handles date click on calendar
   */
  const handleDateClick = (arg: DateClickArg) => {
    const eventsOnDate = events.filter(
      (event) => event?.start?.toISOString().split('T')[0] === arg?.dateStr,
    );

    if (eventsOnDate.length === 1) {
      const eventDate = new Date(eventsOnDate[0].start!);
      const event: CustomCalendarEvent = {
        id: eventsOnDate[0].id,
        title: eventsOnDate[0].title,
        start: eventDate,
        end: eventDate,
        allDay: false,
        startStr: eventDate.toISOString(),
        endStr: eventDate.toISOString(),
        url: '',
        display: 'auto',
        extendedProps: {
          candidate: {
            ...eventsOnDate[0].extendedProps.candidate,
            assignment: eventsOnDate[0].extendedProps.candidate.assignment || {
              interviewerId: null,
              time: new Date().toISOString(),
              assignedAt: new Date().toISOString(),
            },
            tracking: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          interviewer: eventsOnDate[0].extendedProps.interviewer,
        },
      };

      setSelectedEvent(event);
      setIsDetailsOpen(true);
    }
  };

  /**
   * Handles date selection from mini calendar (clicking a day or navigating months)
   * Only updates Quick nav's query params (not Full calendar's)
   * Full calendar keeps its own data intact
   */
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);

    // Calculate the date range for the selected date (always use month view for mini calendar)
    const newRange = calculateDateRange('dayGridMonth', date);

    // Only update Quick nav's params (Full calendar keeps its data)
    setQnQueryParams((prev) => {
      const newStartDate = newRange.startDate.toISOString();
      const newEndDate = newRange.endDate.toISOString();

      if (prev.startDate === newStartDate && prev.endDate === newEndDate) {
        return prev;
      }
      return {
        ...prev,
        startDate: newStartDate,
        endDate: newEndDate,
        view: 'month',
      };
    });
    // NOTE: We do NOT update dateRange or Full calendar's params
  }, []);

  /**
   * Handles view change (Month/Week/Day/Agenda buttons)
   * Only updates Full calendar's query params
   */
  const handleViewChange = useCallback(
    (viewType: CalendarViewType) => {
      setCalendarView(viewType);

      // Calculate new date range based on the new view type and current selected date
      const newRange = calculateDateRange(viewType, selectedDate);
      const apiView = mapViewToApiView(viewType);

      // Only update Full calendar's params
      setFcQueryParams((prev) => {
        const newStartDate = newRange.startDate.toISOString();
        const newEndDate = newRange.endDate.toISOString();

        if (
          prev.startDate === newStartDate &&
          prev.endDate === newEndDate &&
          prev.view === apiView
        ) {
          return prev;
        }
        return {
          ...prev,
          startDate: newStartDate,
          endDate: newEndDate,
          view: apiView,
        };
      });

      // Update local date range for SSE filtering
      setDateRange(newRange);

      // Sync the main FullCalendar view (if available)
      const calApi = calendarRef.current?.getApi();
      if (calApi) {
        calApi.changeView(viewType);
      }
    },
    [selectedDate],
  );

  // Refetches data
  const handleUpdate = useCallback(async () => {
    refetch();
  }, [refetch]);

  // Stats calculations using extracted helpers
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

  // Total interviews = all active assignments for the organization (not just current month)
  // Use the total from the API response when no date range is applied
  const totalInterviews = useMemo(() => {
    // If we have total assignments data (without date range), use that
    if (totalAssignmentsData && totalAssignmentsData[0]?.totalInterviews !== undefined) {
      return totalAssignmentsData[0].totalInterviews;
    }
    // Fallback to events.length if total data not available yet
    return events.length;
  }, [totalAssignmentsData, events.length]);

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
    // Loading state only from Full calendar (Quick nav loads silently)
    isLoading: fcIsLoading || fcIsFetching,
    isInitialLoading,
    refetch,
    user,
    role,
    dateRange,
    events,
    qnEventDates, // Quick nav event dates for mini calendar dots
    todayCount,
    thisWeekCount,
    totalInterviews,
    upcomingCount,
    applyFilter,
    handleEventClick,
    handleSidebarEventClick,
    handleDateClick,
    handleDateSelect,
    handleViewChange,
    handleDatesSet,
    handleUpdate,
  };
}
