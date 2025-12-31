import { useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import logger from '@/lib/logger';
import {
  useLazyFetchAssignmentsQuery,
  useLazyFetchCandidateByIdQuery,
} from '@/lib/features/candidate/candidateApi';

interface UseDashboardAssignmentsParams {
  itemsPerPage: number;
  filterText: string;
  selectedAssignedTo: string;
  triggerFetchAssignments: ReturnType<
    typeof useLazyFetchAssignmentsQuery
  >[0];
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
}

/**
 * Custom hook to manage assignment fetching and pagination logic.
 */
export function useDashboardAssignments({
  itemsPerPage,
  filterText,
  selectedAssignedTo,
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
}: UseDashboardAssignmentsParams) {
  const fetchAssignments = useCallback(
    async (page = 1, isAppend = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;

      if (!isAppend) {
        setIsLoading(true);
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
        }).unwrap();

        setAssignmentsCounts((prev) => ({
          ...prev,
          totalInterviews: data[0]?.totalInterviews || 0,
          todaysInterviews: data[0]?.todaysInterviews || 0,
          thisweeksInterviews: data[0]?.thisweeksInterviews || 0,
        }));
        setAssignedInterviewers([...data[0].assignmentCount]);
        if (isAppend) {
          setAssignments((prev) => [...prev, ...data[0].data]);
        } else {
          setAssignments(data[0]?.data);
        }

        if (data[0]?.data?.length < itemsPerPage) {
          setHasMoreData(false);
        } else {
          setHasMoreData(true);
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
      itemsPerPage,
      triggerFetchAssignments,
      setAssignments,
      setAssignedInterviewers,
      setAssignmentsCounts,
      setIsLoading,
      setIsLoadingMore,
      setHasMoreData,
      loadingRef,
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

