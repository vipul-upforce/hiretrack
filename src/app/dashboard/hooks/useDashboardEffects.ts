import React, { useEffect, useCallback } from 'react';
import { Candidate } from '@/types/candidate';
import logger from '@/lib/logger';

interface UseDashboardEffectsParams {
  // State
  selectedAssignedTo: string;
  filterText: string;
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
  isToday,
  isThisWeek,
  setAssignmentsCounts,
}: UseDashboardEffectsParams) {
  // Effect 1: Fetch assignments when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasMoreData(true);
    setAssignments([]);
    fetchAssignments(1, false);
  }, [
    selectedAssignedTo,
    filterText,
    fetchAssignments,
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
          if (
            'assignment' in sseCandidate &&
            sseCandidate._id &&
            sseCandidate.assignment &&
            'interviewerId' in sseCandidate.assignment
          ) {
            const candidateId = sseCandidate._id;
            const existingIndex = updatedAssignments.findIndex(
              (assignment) => (assignment._id || assignment.id) === candidateId,
            );

            // Check if this candidate matches the current interviewer filter
            const matchesFilter = matchesInterviewerFilter(sseCandidate);

            if (!sseCandidate.assignment) {
              if (existingIndex !== -1) {
                const removed = updatedAssignments[existingIndex];
                removedCount += 1;
                if (isToday(removed)) removedTodayCount += 1;
                if (isThisWeek(removed)) removedWeekCount += 1;
                updatedAssignments = updatedAssignments.filter(
                  (_, index) => index !== existingIndex,
                );
              }
            } else {
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

                  updatedAssignments[existingIndex] = {
                    ...updatedAssignments[existingIndex],
                    ...assignment,
                  };
                }
              } else if (matchesFilter) {
                // New assignment that matches filter - add it
                addedCount += 1;
                if (isToday(assignment)) addedTodayCount += 1;
                if (isThisWeek(assignment)) addedWeekCount += 1;
                updatedAssignments.push(assignment);
              }
              // If new assignment doesn't match filter, skip adding it
            }
          } else if (
            !sseCandidate.assignment ||
            !sseCandidate.assignment.interviewerId
          ) {
            logger.log('No SSE assignment found');
            const candidateId = sseCandidate._id;
            const existingIndex = updatedAssignments.findIndex(
              (assignment) => (assignment._id || assignment.id) === candidateId,
            );
            if (existingIndex !== -1) {
              const removed = updatedAssignments[existingIndex];
              removedCount += 1;
              if (isToday(removed)) removedTodayCount += 1;
              if (isThisWeek(removed)) removedWeekCount += 1;
              updatedAssignments = updatedAssignments.filter(
                (_, index) => index !== existingIndex,
              );
            }
          }
        });

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

        return [...updatedAssignments];
      });
    }
  }, [
    sseCandidates,
    selectedAssignedTo,
    filterText,
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
