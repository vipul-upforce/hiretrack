'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { useLazyFetchAssignmentsQuery } from '@/lib/features/candidate/candidateApi';
import { Button } from '@/components/ui/button';
import ActionItems from '@/components/actionitems';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useDashboardAssignments } from '../hooks/useDashboardAssignments';
import { useDashboardEffects } from '../hooks/useDashboardEffects';
import { SortConfig } from '../hooks/useDashboardState';
import { isToday, isThisWeek } from '../utils/dateHelpers';
import DashboardCards from './DashboardCards';

interface HrAssignmentsSectionProps {
  itemsPerPage: number;
  filterText: string;
  sortConfig: SortConfig;
  sseCandidates: Candidate[];
  user: { id?: string; email?: string; role?: string } | null;
  scrollContainerRef:
  | React.RefObject<HTMLDivElement | null>
  | React.RefObject<HTMLDivElement>;
  isActivitiesSidebarOpen: boolean;
}

function DashboardEmptyState({
  title,
  description,
  Icon,
  minHeight = 'min-h-[420px]',
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  minHeight?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div
      className={`w-full flex rounded-2xl justify-center items-center border border-border/70 bg-background/80 px-6 py-10 h-full ${minHeight} max-h-[100px]`}
    >
      <div className="flex min-h-full my-auto flex-col items-center justify-center text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
        {actionLabel && actionHref && (
          <div className="mt-6">
            <Button asChild variant="primary">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function HrAssignmentsSection({
  itemsPerPage,
  filterText,
  sortConfig,
  sseCandidates,
  user,
  scrollContainerRef,
  isActivitiesSidebarOpen
}: HrAssignmentsSectionProps) {
  const [assignments, setAssignments] = useState<Candidate[]>([]);
  const [assignmentsCounts, setAssignmentsCounts] = useState<{
    [key: string]: number;
  }>({
    totalInterviews: 0,
    thisweeksInterviews: 0,
    todaysInterviews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sseAddedCountRef = useRef(0);
  const totalCountMembershipRef = useRef<Set<string>>(new Set());

  const [triggerFetchAssignments] = useLazyFetchAssignmentsQuery();
  const setAssignedInterviewers = useCallback(() => { }, []);

  const selectedAssignedTo = user?.id ? String(user.id) : '';
  const sseCandidatesForSection = hasFetchedOnce ? sseCandidates : [];

  useEffect(() => {
    setHasFetchedOnce(false);
  }, [filterText, sortConfig.field, sortConfig.order, selectedAssignedTo]);

  const { fetchAssignments, loadMoreData } = useDashboardAssignments({
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
  });

  const fetchAssignmentsWithBaseline = useCallback(
    async (
      page: number,
      isAppend: boolean,
      options?: { silent?: boolean },
    ) => {
      await fetchAssignments(page, isAppend, options);
      if (!isAppend && page === 1) {
        setHasFetchedOnce(true);
      }
    },
    [fetchAssignments],
  );

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.9 && hasMoreData && !isLoadingMore) {
      loadMoreData();
    }
  }, [hasMoreData, isLoadingMore, loadMoreData, scrollContainerRef]);

  const { lastElementRef } = useDashboardEffects({
    selectedAssignedTo,
    filterText,
    sortConfig,
    fetchAssignments: fetchAssignmentsWithBaseline,
    scrollContainerRef,
    handleScroll,
    isLoadingMore,
    hasMoreData,
    loadMoreData,
    observerRef,
    setCurrentPage,
    setHasMoreData,
    setAssignments,
    assignmentsCounts,
    isActivitiesSidebarOpen,
    sseCandidates: sseCandidatesForSection,
    sseAddedCountRef,
    totalCountMembershipRef,
    isToday,
    isThisWeek,
    setAssignmentsCounts,
  });

  const assignmentsFiltered = useMemo(() => (assignments || []).filter((assignment) => {
    if (assignment.isDeleted) return false;
    if (!assignment.assignment || assignment.assignment.interviewerId === null) {
      return false;
    }
    return true;
  }), [assignments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Assigned Candidates</h2>
        <span className="text-xs font-medium text-muted-foreground">
          HR View
        </span>
      </div>

      {isLoading ? (
        <DashboardSkeleton role={user?.role || null} />
      ) : (
        <>
          <DashboardCards assignmentsCounts={assignmentsCounts} />

          {assignmentsFiltered.length > 0 ? (
            <div className="flex flex-wrap justify-start gap-6">
              {assignmentsFiltered.map((assignment, index) => {
                if (!assignment.assignment?.interviewerId) {
                  return null;
                }
                return (
                  <div
                    key={assignment.id || assignment._id}
                    ref={
                      index === assignmentsFiltered.length - 1
                        ? lastElementRef
                        : null
                    }
                  >
                    <ActionItems
                      assignment={
                        sseCandidatesForSection.find(
                          (candidate) => candidate._id === assignment._id,
                        ) || assignment
                      }
                      assignments={assignmentsFiltered}
                      setAssignments={setAssignments}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <DashboardEmptyState
              title="No assignments yet"
              description="You do not have any assigned candidates yet. Once assignments are created for you, they will appear here automatically."
              Icon={ClipboardList}
              minHeight="min-h-[320px]"
              actionLabel="Open Jobs Board"
              actionHref="/dashboard/jobs-board"
            />
          )}

          {isLoadingMore && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-gray-500">
                Loading more assignments...
              </span>
            </div>
          )}
        </>
      )}

      <div className="h-px w-full bg-border/60" />
    </div>
  );
}
