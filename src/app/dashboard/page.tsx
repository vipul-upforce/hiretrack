'use client';

import { useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { useMarkNotificationAsReadMutation } from '@/lib/features/notifications/notificationsApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import {
  useLazyFetchAssignmentsQuery,
  useLazyFetchCandidateByIdQuery,
} from '@/lib/features/candidate/candidateApi';
import { CandidateDetailsDialog } from './jobs/[id]/components/Dialogs/candidate-details-dialog';
import RecentActivities from './components/RecentActivities';
import { useDashboardState } from './hooks/useDashboardState';
import { useDashboardAssignments } from './hooks/useDashboardAssignments';
import { useDashboardEffects } from './hooks/useDashboardEffects';
import { useDashboardNotifications } from './hooks/useDashboardNotifications';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardContent } from './components/DashboardContent';
import { isToday, isThisWeek } from './utils/dateHelpers';

export default function DashboardPage() {
  const itemsPerPage = 20;
  const { user } = useAppSelector((state) => state.auth || {});
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();
  const [triggerFetchAssignments] = useLazyFetchAssignmentsQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const { candidates: sseCandidates } = useSSE(() => {}, null);
  const { notifications, isLoading: notificationsLoading } =
    useNotificationsContext();

  // Consolidate all state
  const state = useDashboardState();

  // Assignment fetching logic
  const { fetchAssignments, loadMoreData } = useDashboardAssignments({
    itemsPerPage,
    filterText: state.filterText,
    selectedAssignedTo: state.selectedAssignedTo,
    triggerFetchAssignments,
    setAssignments: state.setAssignments,
    setAssignedInterviewers: state.setAssignedInterviewers,
    setAssignmentsCounts: state.setAssignmentsCounts,
    setIsLoading: state.setIsLoading,
    setIsLoadingMore: state.setIsLoadingMore,
    setHasMoreData: state.setHasMoreData,
    loadingRef: state.loadingRef,
    currentPage: state.currentPage,
    setCurrentPage: state.setCurrentPage,
    hasMoreData: state.hasMoreData,
    isLoadingMore: state.isLoadingMore,
  });

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (!state.scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      state.scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.9 && state.hasMoreData && !state.isLoadingMore) {
      loadMoreData();
    }
  }, [
    loadMoreData,
    state.hasMoreData,
    state.isLoadingMore,
    state.scrollContainerRef,
  ]);

  // Side effects
  const { lastElementRef } = useDashboardEffects({
    selectedAssignedTo: state.selectedAssignedTo,
    filterText: state.filterText,
    fetchAssignments,
    scrollContainerRef: state.scrollContainerRef,
    handleScroll,
    isLoadingMore: state.isLoadingMore,
    hasMoreData: state.hasMoreData,
    loadMoreData,
    observerRef: state.observerRef,
    setCurrentPage: state.setCurrentPage,
    setHasMoreData: state.setHasMoreData,
    setAssignments: state.setAssignments,
    isActivitiesSidebarOpen: state.isActivitiesSidebarOpen,
    sseCandidates,
    isToday,
    isThisWeek,
    setAssignmentsCounts: state.setAssignmentsCounts,
  });

  // Notification handling
  const { handleNotificationClick } = useDashboardNotifications({
    markAsRead,
    fetchCandidateById,
    setSelectedCandidate: state.setSelectedCandidate,
    setIsCandidateDialogOpen: state.setIsCandidateDialogOpen,
  });

  // Computed values
  const shouldShowAssignments = user?.role === 'admin' || user?.role === 'hr';
  const isInterviewer = user?.role === 'interviewer';
  const showRecentActivities = user?.role === 'admin' || user?.role === 'hr';

  const interviewerAssignments = state.assignments?.filter((assignment) =>
    isInterviewer
      ? (assignment.assignment?.interviewerId as { email: string })?.email ===
        user?.email
      : assignment,
  );

  const todayAssignments = interviewerAssignments?.filter((assignment) => {
    const assignmentDate = new Date(assignment?.assignment?.time || '');
    const today = new Date();
    return (
      assignmentDate.getDate() === today.getDate() &&
      assignmentDate.getMonth() === today.getMonth() &&
      assignmentDate.getFullYear() === today.getFullYear()
    );
  });

  // Helper function to check if a candidate has a valid assignment
  const hasValidAssignment = (assignment: Candidate): boolean => {
    // Exclude deleted candidates
    if (assignment.isDeleted) return false;
    
    // Exclude candidates with no assignment or assignment with null interviewerId
    if (!assignment.assignment || assignment.assignment.interviewerId === null) {
      return false;
    }
    
    return true;
  };

  const assignmentsFiltered = (state.assignments || []).filter(hasValidAssignment);

  const options = state.assignedInterviewers
    ?.map((usr) => ({
      label:
        usr.interviewerId === user?.id
          ? `Me (${usr.count})`
          : `${usr.name} (${usr.count})`,
      value: usr.interviewerId,
    }))
    ?.sort((a) => (a.label === 'Me' ? -1 : 1));

  const applyFilter = () => {
    state.setFilterText(state.searchText);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <DashboardHeader
        searchText={state.searchText}
        onSearchTextChange={state.setSearchText}
        onApplyFilter={applyFilter}
        open={state.open}
        setOpen={state.setOpen}
        selectedAssignedTo={state.selectedAssignedTo}
        setSelectedAssignedTo={state.setSelectedAssignedTo}
        options={options || []}
        showRecentActivities={showRecentActivities}
        isActivitiesSidebarOpen={state.isActivitiesSidebarOpen}
        onToggleSidebar={() =>
          state.setIsActivitiesSidebarOpen(!state.isActivitiesSidebarOpen)
        }
        userRole={user?.role}
      />

      <div className="mt-4 flex min-h-0 flex-1 gap-4 overflow-hidden px-4 pb-4">
        <DashboardContent
          isLoading={state.isLoading}
          assignments={state.assignments}
          assignmentsCounts={state.assignmentsCounts}
          shouldShowAssignments={shouldShowAssignments}
          isInterviewer={isInterviewer}
          assignmentsFiltered={assignmentsFiltered}
          sseCandidates={sseCandidates || []}
          lastElementRef={lastElementRef}
          isLoadingMore={state.isLoadingMore}
          todayAssignments={todayAssignments || []}
          interviewerAssignments={interviewerAssignments || []}
          user={user}
          scrollContainerRef={state.scrollContainerRef}
          showRecentActivities={showRecentActivities}
          isActivitiesSidebarOpen={state.isActivitiesSidebarOpen}
          setAssignments={state.setAssignments}
        />

        {showRecentActivities && state.isActivitiesSidebarOpen && (
          <div className="w-96 flex-shrink-0 overflow-y-auto">
            <RecentActivities
              notifications={notifications}
              isLoading={notificationsLoading}
              onNotificationClick={handleNotificationClick}
            />
          </div>
        )}
      </div>

      <CandidateDetailsDialog
        isAssigning={false}
        setIsAssigning={() => {}}
        candidate={state.selectedCandidate}
        isOpen={state.isCandidateDialogOpen}
        onOpenChange={state.setIsCandidateDialogOpen}
        onUpdate={(updatedCandidate) => {
          // Update local state with the updated candidate instead of refetching
          // The mutation already returns the updated candidate, so no need to refetch
          if (updatedCandidate && state.selectedCandidate?._id === updatedCandidate._id) {
            state.setSelectedCandidate(updatedCandidate);
          }
        }}
        hideEditButton={user?.role === 'interviewer'}
        hideCloseButtons={false}
      />
    </div>
  );
}
