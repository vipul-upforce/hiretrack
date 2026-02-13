import React, { useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import logger from '@/lib/logger';
import { useLazyFetchAssignmentsQuery } from '@/lib/features/candidate/candidateApi';
import { SortConfig } from './useDashboardState';

/**
 * Helper function to check if a candidate has a valid assignment
 * Valid assignment means: assignment exists, is not null, and has a non-null interviewerId
 */
const hasValidAssignment = (assignment: Candidate): boolean => {
  // Exclude deleted candidates
  if (assignment.isDeleted) return false;

  // Exclude candidates with no assignment or assignment with null interviewerId
  if (!assignment.assignment || assignment.assignment.interviewerId === null) {
    return false;
  }

  return true;
};

interface UseDashboardAssignmentsParams {
  itemsPerPage: number;
  filterText: string;
  selectedAssignedTo: string;
  sortConfig: SortConfig;
  triggerFetchAssignments: ReturnType<typeof useLazyFetchAssignmentsQuery>[0];
  setAssignments: React.Dispatch<React.SetStateAction<Candidate[]>>;
  setAssignedInterviewers: React.Dispatch<
    React.SetStateAction<
      Array<{
        count: number;
        interviewerId: string;
        name: string;
        email: string;
      }>
    >
  >;
  setAssignmentsCounts: React.Dispatch<
    React.SetStateAction<{
      [key: string]: number;
    }>
  >;
  setIsLoading: (loading: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setHasMoreData: (hasMore: boolean) => void;
  loadingRef: React.MutableRefObject<boolean>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  hasMoreData: boolean;
  isLoadingMore: boolean;
  /** Ref tracking SSE additions to adjust pagination offset */
  sseAddedCountRef: React.MutableRefObject<number>;
  /** Tracks IDs included in current total-count scope across all pages */
  totalCountMembershipRef: React.MutableRefObject<Set<string>>;
}

/**
 * Custom hook to manage assignment fetching and pagination logic.
 */
export function useDashboardAssignments({
  itemsPerPage,
  filterText,
  selectedAssignedTo,
  sortConfig,
  triggerFetchAssignments,
  setAssignments,
  setAssignedInterviewers,
  setAssignmentsCounts,
  setIsLoading,
  setIsLoadingMore,
  setHasMoreData,
  loadingRef,
  currentPage,
  setCurrentPage,
  hasMoreData,
  isLoadingMore,
  sseAddedCountRef,
  totalCountMembershipRef,
}: UseDashboardAssignmentsParams) {
  const fetchAssignments = useCallback(
    async (page = 1, isAppend = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;

      if (!isAppend) {
        setIsLoading(true);
        // Reset SSE offset counter on fresh fetch
        sseAddedCountRef.current = 0;
        // Reset total-scope membership before rebuilding from fresh data
        totalCountMembershipRef.current = new Set<string>();
      } else {
        setIsLoadingMore(true);
      }

      try {
        const data = await triggerFetchAssignments({
          isPagination: true,
          page,
          limit: itemsPerPage,
          filterValue: filterText.toString(),
          assignedTo: selectedAssignedTo,
          sortBy: sortConfig.field,
          sortOrder: sortConfig.order,
          // Compensate for SSE-added items to prevent duplicates
          sseOffset: isAppend ? sseAddedCountRef.current : 0,
        }).unwrap();

        setAssignmentsCounts((prev) => ({
          ...prev,
          totalInterviews: data[0]?.totalInterviews || 0,
          todaysInterviews: data[0]?.todaysInterviews || 0,
          thisweeksInterviews: data[0]?.thisweeksInterviews || 0,
        }));
        setAssignedInterviewers([...data[0].assignmentCount]);

        // Filter out candidates with null assignments or null interviewerId
        const validAssignments = (data[0]?.data || []).filter(
          hasValidAssignment,
        );

        if (isAppend) {
          setAssignments((prev) => [...prev, ...validAssignments]);
        } else {
          setAssignments(validAssignments);
        }

        if (data[0]?.data?.length < itemsPerPage) {
          setHasMoreData(false);
        } else {
          setHasMoreData(true);
        }

        // Build full-scope ID set used by SSE total count calculation.
        // This includes all pages for current filters/interviewer selection.
        if (!isAppend) {
          const fullData = await triggerFetchAssignments({
            isPagination: false,
            page: 1,
            limit: itemsPerPage,
            filterValue: filterText.toString(),
            assignedTo: selectedAssignedTo,
            sortBy: sortConfig.field,
            sortOrder: sortConfig.order,
            sseOffset: 0,
          }).unwrap();

          const scopedIds = new Set<string>();
          (fullData[0]?.data || []).forEach((candidate) => {
            if (!hasValidAssignment(candidate)) return;
            const id = candidate._id || candidate.id;
            if (id) scopedIds.add(id);
          });
          totalCountMembershipRef.current = scopedIds;
        }
      } catch (error) {
        logger.error('Error fetching assignments:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [
      filterText,
      selectedAssignedTo,
      sortConfig,
      itemsPerPage,
      triggerFetchAssignments,
      setAssignments,
      setAssignedInterviewers,
      setAssignmentsCounts,
      setIsLoading,
      setIsLoadingMore,
      setHasMoreData,
      loadingRef,
      totalCountMembershipRef,
    ],
  );

  const loadMoreData = useCallback(() => {
    if (!hasMoreData || isLoadingMore || loadingRef.current) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchAssignments(nextPage, true);
  }, [
    currentPage,
    hasMoreData,
    isLoadingMore,
    fetchAssignments,
    setCurrentPage,
    loadingRef,
  ]);

  return {
    fetchAssignments,
    loadMoreData,
  };
}
