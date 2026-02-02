import React, { useEffect, useCallback, useRef } from 'react';
import { Candidate } from '@/types/candidate';
import { SortConfig, SortField } from './useDashboardState';

interface UseDashboardEffectsParams {
  // State
  selectedAssignedTo: string;
  filterText: string;
  sortConfig: SortConfig;
  fetchAssignments: (page: number, isAppend: boolean) => Promise<void>;
  scrollContainerRef:
    | React.RefObject<HTMLDivElement | null>
    | React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  isLoadingMore: boolean;
  hasMoreData: boolean;
  loadMoreData: () => void;
  observerRef: React.MutableRefObject<IntersectionObserver | null>;
  setCurrentPage: (page: number) => void;
  setHasMoreData: (hasMore: boolean) => void;
  setAssignments: React.Dispatch<React.SetStateAction<Candidate[]>>;
  isActivitiesSidebarOpen: boolean;

  // SSE
  sseCandidates: Candidate[] | undefined;
  /** Ref to track SSE additions for pagination offset adjustment */
  sseAddedCountRef: React.MutableRefObject<number>;

  // Helper functions
  isToday: (assignment: Candidate) => boolean;
  isThisWeek: (assignment: Candidate) => boolean;
  setAssignmentsCounts: React.Dispatch<
    React.SetStateAction<{
      [key: string]: number;
    }>
  >;
}

/**
 * Custom hook to manage all side effects for the dashboard page.
 * Consolidates all useEffect hooks into a single hook.
 */
export function useDashboardEffects({
  selectedAssignedTo,
  filterText,
  sortConfig,
  fetchAssignments,
  scrollContainerRef,
  handleScroll,
  isLoadingMore,
  hasMoreData,
  loadMoreData,
  observerRef,
  setCurrentPage,
  setHasMoreData,
  setAssignments,
  isActivitiesSidebarOpen,
  sseCandidates,
  sseAddedCountRef,
  isToday,
  isThisWeek,
  setAssignmentsCounts,
}: UseDashboardEffectsParams) {
  /**
   * Ref to hold the latest fetchAssignments function.
   * This prevents Effect 1 from re-running when fetchAssignments reference changes
   * due to its internal dependencies (like sortConfig), while still allowing us
   * to call the latest version of the function.
   *
   * Without this pattern, any change to fetchAssignments' dependencies would
   * trigger a refetch, potentially overwriting SSE updates (race condition).
   */
  const fetchAssignmentsRef = useRef(fetchAssignments);

  // Keep the ref updated with the latest function
  useEffect(() => {
    fetchAssignmentsRef.current = fetchAssignments;
  }, [fetchAssignments]);

  // Effect 1: Fetch assignments when filters or sort config change
  // Uses ref pattern to avoid re-running when fetchAssignments changes due to internal deps
  useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setAssignments([]);
    fetchAssignmentsRef.current(1, false);
  }, [
    selectedAssignedTo,
    filterText,
    // Explicitly depend on sort config fields rather than through fetchAssignments
    sortConfig.field,
    sortConfig.order,
    setCurrentPage,
    setHasMoreData,
    setAssignments,
  ]);

  // Effect 2: Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return undefined;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, scrollContainerRef]);

  // Effect 3: Save sidebar preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'dashboard-notifications-sidebar',
        isActivitiesSidebarOpen ? 'open' : 'closed',
      );
    }
  }, [isActivitiesSidebarOpen]);

  // Helper function to check if a candidate has a valid assignment
  const hasValidAssignment = (assignment: Candidate): boolean => {
    // Exclude deleted candidates
    if (assignment.isDeleted) return false;

    // Exclude candidates with no assignment or assignment with null interviewerId
    if (
      !assignment.assignment ||
      assignment.assignment.interviewerId === null
    ) {
      return false;
    }

    return true;
  };

  // Helper to extract interviewer ID from assignment (can be string or object)
  const getInterviewerId = (
    interviewerId: string | { _id: string } | null | undefined,
  ): string | null => {
    if (!interviewerId) return null;
    if (typeof interviewerId === 'string') return interviewerId;
    if (typeof interviewerId === 'object' && '_id' in interviewerId) {
      return interviewerId._id;
    }
    return null;
  };

  // Helper to check if SSE candidate matches the current interviewer filter
  const matchesInterviewerFilter = (sseCandidate: Candidate): boolean => {
    // If no filter applied, all candidates match
    if (!selectedAssignedTo) return true;

    const interviewerId = getInterviewerId(
      sseCandidate.assignment?.interviewerId,
    );
    return interviewerId === selectedAssignedTo;
  };

  /**
   * Get comparable value for a candidate based on sort field.
   * Returns a value that can be compared for sorting.
   * String fields are lowercased for case-insensitive sorting.
   */
  const getSortValue = (
    candidate: Candidate,
    field: SortField,
  ): number | string => {
    switch (field) {
      case 'assignment.time':
        return new Date(candidate.assignment?.time || 0).getTime();
      case 'name':
        return (candidate.name || '').toLowerCase();
      case 'createdAt':
        return new Date(candidate.createdAt || 0).getTime();
      case 'jobId.title':
        return (
          (typeof candidate.jobId === 'object' ? candidate.jobId?.title : '') ||
          ''
        ).toLowerCase();
      default:
        return 0;
    }
  };

  /**
   * Find the correct index to insert an item in a sorted array using binary search.
   * Maintains sort order when inserting new SSE items.
   */
  const findSortedIndex = (
    array: Candidate[],
    item: Candidate,
    config: SortConfig,
  ): number => {
    if (array.length === 0) return 0;

    const itemValue = getSortValue(item, config.field);
    let low = 0;
    let high = array.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const midValue = getSortValue(array[mid], config.field);

      let shouldGoAfter: boolean;
      if (typeof itemValue === 'number' && typeof midValue === 'number') {
        shouldGoAfter =
          config.order === 'asc' ? itemValue > midValue : itemValue < midValue;
      } else {
        const comparison = String(itemValue).localeCompare(String(midValue));
        shouldGoAfter =
          config.order === 'asc' ? comparison > 0 : comparison < 0;
      }

      if (shouldGoAfter) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  };

  // Effect 4: Update assignments from SSE
  useEffect(() => {
    if (sseCandidates && sseCandidates.length > 0) {
      setAssignments((prevAssignments) => {
        let updatedAssignments: Candidate[] = [...prevAssignments];
        let addedCount = 0;
        let removedCount = 0;
        let addedTodayCount = 0;
        let removedTodayCount = 0;
        let addedWeekCount = 0;
        let removedWeekCount = 0;

        (sseCandidates as Candidate[]).forEach((sseCandidate) => {
          const candidateId = sseCandidate._id;
          if (!candidateId) return;

          const existingIndex = updatedAssignments.findIndex(
            (assignment) => (assignment._id || assignment.id) === candidateId,
          );

          // Check if candidate has a valid assignment (not null and has interviewerId)
          const isValid = hasValidAssignment(sseCandidate as Candidate);

          // If assignment is null or invalid, remove from list
          if (!isValid) {
            if (existingIndex !== -1) {
              const removed = updatedAssignments[existingIndex];
              removedCount += 1;
              if (isToday(removed)) removedTodayCount += 1;
              if (isThisWeek(removed)) removedWeekCount += 1;
              updatedAssignments = updatedAssignments.filter(
                (_, index) => index !== existingIndex,
              );
            }
            return; // Skip processing this candidate
          }

          // Candidate has valid assignment - process it
          if (
            'assignment' in sseCandidate &&
            sseCandidate.assignment &&
            'interviewerId' in sseCandidate.assignment
          ) {
            // Check if this candidate matches the current interviewer filter
            const matchesFilter = matchesInterviewerFilter(sseCandidate);

            const assignment: Candidate = {
              id: sseCandidate._id!,
              _id: sseCandidate._id,
              email: sseCandidate.email,
              candidateName: sseCandidate.name,
              contact: sseCandidate.contact,
              jobTitle: sseCandidate.jobId.title,
              interviewDate: sseCandidate.assignment.time,
              status: sseCandidate.status || 'pending',
              assignment: (sseCandidate as Candidate).assignment,
              jobId: (sseCandidate as Candidate).jobId,
              name: (sseCandidate as Candidate).name,
              resume: (sseCandidate as Candidate).resume,
              tracking: (sseCandidate as Candidate).tracking,
              organizationId: sseCandidate.organizationId,
              location: sseCandidate.location,
              experience: sseCandidate.experience,
              relevantExperience: sseCandidate.relevantExperience,
              skills: sseCandidate.skills,
              tags: sseCandidate.tags,
              expectedCTC: sseCandidate.expectedCTC,
              currentCTC: sseCandidate.currentCTC,
              noticePeriod: sseCandidate.noticePeriod,
              remarks: (() => {
                const candidateRemarks = (sseCandidate as Candidate).remarks;
                if (Array.isArray(candidateRemarks)) {
                  return candidateRemarks;
                }
                return candidateRemarks || [];
              })(),
              attachments: (sseCandidate as Candidate).attachments,
              customFields: (sseCandidate as Candidate).customFields,
              createdAt: sseCandidate.createdAt,
              updatedAt: sseCandidate.updatedAt,
            };

            if (existingIndex !== -1) {
              // Existing candidate - check if interviewer changed and no longer matches filter
              if (!matchesFilter) {
                // Interviewer changed to someone outside filter, remove from list
                const removed = updatedAssignments[existingIndex];
                removedCount += 1;
                if (isToday(removed)) removedTodayCount += 1;
                if (isThisWeek(removed)) removedWeekCount += 1;
                updatedAssignments = updatedAssignments.filter(
                  (_, index) => index !== existingIndex,
                );
              } else {
                // Update existing - check if date filters changed
                const oldAssignment = updatedAssignments[existingIndex];
                const wasToday = isToday(oldAssignment);
                const wasThisWeek = isThisWeek(oldAssignment);
                const isNowToday = isToday(assignment);
                const isNowThisWeek = isThisWeek(assignment);

                if (wasToday && !isNowToday) removedTodayCount += 1;
                if (!wasToday && isNowToday) addedTodayCount += 1;
                if (wasThisWeek && !isNowThisWeek) removedWeekCount += 1;
                if (!wasThisWeek && isNowThisWeek) addedWeekCount += 1;

                // Check if sort field changed - if so, need to re-position
                const oldSortValue = getSortValue(
                  oldAssignment,
                  sortConfig.field,
                );
                const newSortValue = getSortValue(assignment, sortConfig.field);

                if (oldSortValue !== newSortValue) {
                  // Sort field changed - remove and re-insert at correct position
                  updatedAssignments.splice(existingIndex, 1);
                  const newIndex = findSortedIndex(
                    updatedAssignments,
                    assignment,
                    sortConfig,
                  );
                  updatedAssignments.splice(newIndex, 0, assignment);
                } else {
                  // Sort field unchanged - update in place
                  updatedAssignments[existingIndex] = {
                    ...updatedAssignments[existingIndex],
                    ...assignment,
                  };
                }
              }
            } else if (matchesFilter) {
              // New assignment that matches filter - insert at sorted position
              addedCount += 1;
              // Track SSE additions for pagination offset adjustment
              sseAddedCountRef.current += 1;
              if (isToday(assignment)) addedTodayCount += 1;
              if (isThisWeek(assignment)) addedWeekCount += 1;
              const insertIndex = findSortedIndex(
                updatedAssignments,
                assignment,
                sortConfig,
              );
              updatedAssignments.splice(insertIndex, 0, assignment);
            }
            // If new assignment doesn't match filter, skip adding it
          }
        });

        // Final cleanup: Remove any candidates with invalid assignments that might have slipped through
        const cleanedAssignments =
          updatedAssignments.filter(hasValidAssignment);

        // Incrementally adjust counts instead of replacing them
        setAssignmentsCounts((prev) => ({
          totalInterviews: Math.max(
            0,
            (prev.totalInterviews || 0) + addedCount - removedCount,
          ),
          todaysInterviews: Math.max(
            0,
            (prev.todaysInterviews || 0) + addedTodayCount - removedTodayCount,
          ),
          thisweeksInterviews: Math.max(
            0,
            (prev.thisweeksInterviews || 0) + addedWeekCount - removedWeekCount,
          ),
        }));

        return cleanedAssignments;
      });
    }
    // NOTE: filterText is intentionally NOT in dependencies - this effect only handles SSE updates
    // and SSE candidates are already server-filtered. Including filterText would cause unnecessary
    // re-processing of all SSE candidates when text filter changes.
    // sseAddedCountRef is a ref (stable reference) so it doesn't need to be in deps.
  }, [
    sseCandidates,
    selectedAssignedTo,
    // Using specific sortConfig fields to avoid re-runs on object reference changes
    sortConfig.field,
    sortConfig.order,
    setAssignments,
    isToday,
    isThisWeek,
    setAssignmentsCounts,
  ]);

  // Create lastElementRef callback for intersection observer
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreData) {
            loadMoreData();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '100px',
        },
      );

      if (node) observerRef.current.observe(node);
    },
    [isLoadingMore, hasMoreData, loadMoreData, observerRef],
  );

  return {
    lastElementRef,
  };
}
