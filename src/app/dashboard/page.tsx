'use client';

import { useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { toast } from '@/hooks/use-toast';
import { useMarkNotificationAsReadMutation } from '@/lib/features/notifications/notificationsApi';
import { useAppSelector } from '@/lib/redux/hooks';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import {
  useLazyFetchAssignmentsQuery,
  useLazyFetchCandidateByIdQuery,
  useBulkUpdateCandidatesMutation,
} from '@/lib/features/candidate/candidateApi';
import { Candidate, CandidateStatus } from '@/types/candidate';
import { useGlobalChecklistValidation } from '@/hooks/useGlobalChecklistValidation';
import { CandidateDetailsDialog } from './jobs/[id]/components/Dialogs/candidate-details-dialog';
import RecentActivities from './components/RecentActivities';
import { useDashboardState } from './hooks/useDashboardState';
import { useDashboardAssignments } from './hooks/useDashboardAssignments';
import { useDashboardEffects } from './hooks/useDashboardEffects';
import { useDashboardNotifications } from './hooks/useDashboardNotifications';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardContent } from './components/DashboardContent';
import { isToday, isThisWeek } from './utils/dateHelpers';
import ChecklistRemarksDialog from './jobs/[id]/components/Dialogs/checklist-remarks-components/checklist-remarks-dialog';

export default function DashboardPage() {
  const itemsPerPage = 20;
  const { user } = useAppSelector((state) => state.auth || {});
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();
  const [triggerFetchAssignments] = useLazyFetchAssignmentsQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const { candidates: sseCandidates } = useSSE(() => { }, null);
  const { notifications, isLoading: notificationsLoading } =
    useNotificationsContext();

  // Consolidate all state
  const state = useDashboardState();

  const currentJobId =
    typeof state.selectedCandidate?.jobId === 'object'
      ? state.selectedCandidate?.jobId?._id
      : state.selectedCandidate?.jobId;

  const checklistValidation = useGlobalChecklistValidation(currentJobId as string);

  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();

  // Assignment fetching logic
  const { fetchAssignments, loadMoreData } = useDashboardAssignments({
    itemsPerPage,
    filterText: state.filterText,
    selectedAssignedTo: state.selectedAssignedTo,
    sortConfig: state.sortConfig,
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
    sseAddedCountRef: state.sseAddedCountRef,
    totalCountMembershipRef: state.totalCountMembershipRef,
  });

  /** Called from submit hook when statusDeferredFromUnified: apply status, refetch, update local state, clear pending, optionally open next (incoming) checklist. Runs in same call stack as submit. */
  const handleApplyDeferredStatus = (candidateId: string, newStatus: string) =>
    bulkUpdateCandidates({
      operation: 'statusUpdate',
      candidateIds: [String(candidateId)],
      status: newStatus,
    })
      .unwrap()
      .then(() => fetchAssignments(1))
      .then(() => {
        if (
          state.selectedCandidate &&
          (state.selectedCandidate._id === candidateId ||
            String(state.selectedCandidate._id) === String(candidateId))
        ) {
          state.setSelectedCandidate({
            ...state.selectedCandidate,
            status: newStatus as CandidateStatus,
          });
        }
        state.setAssignments((prev) =>
          (prev || []).map((c) =>
            c._id === candidateId || String(c._id) === String(candidateId)
              ? { ...c, status: newStatus as CandidateStatus }
              : c,
          ),
        );
      })
      .then(() => {
        const nextChecklist =
          checklistValidation.pendingIncomingChecklistAfterStatus;
        if (
          nextChecklist &&
          checklistValidation.setOpenRemarksFor &&
          checklistValidation.setPendingIncomingChecklistAfterStatus
        ) {
          checklistValidation.setOpenRemarksFor(nextChecklist);
          checklistValidation.setPendingIncomingChecklistAfterStatus(null);
        }
      })
      .finally(() => {
        checklistValidation.setPendingStatusAfterChecklist(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to update status';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
        throw err;
      })

  /** Fallback when onApplyDeferredStatus not used: read pending from ref and apply status after dialog closes. */
  const handleChecklistComplete = (candidateId: string) => {
    const pending = checklistValidation.pendingStatusAfterChecklistRef.current;
    if (
      !pending ||
      String(pending.candidateId) !== String(candidateId) ||
      !checklistValidation.setPendingStatusAfterChecklist
    ) {
      return;
    }
    const { newStatus } = pending;
    bulkUpdateCandidates({
      operation: 'statusUpdate',
      candidateIds: [String(candidateId)],
      status: newStatus,
    })
      .unwrap()
      .then(() => fetchAssignments(1))
      .then(() => {
        if (
          state.selectedCandidate &&
          (state.selectedCandidate._id === candidateId ||
            String(state.selectedCandidate._id) === String(candidateId))
        ) {
          state.setSelectedCandidate({
            ...state.selectedCandidate,
            status: newStatus as CandidateStatus,
          });
        }
        state.setAssignments((prev) =>
          (prev || []).map((c) =>
            c._id === candidateId || String(c._id) === String(candidateId)
              ? { ...c, status: newStatus as CandidateStatus }
              : c,
          ),
        );
      })
      .then(() => {
        const nextChecklist =
          checklistValidation.pendingIncomingChecklistAfterStatus;
        if (
          nextChecklist &&
          checklistValidation.setOpenRemarksFor &&
          checklistValidation.setPendingIncomingChecklistAfterStatus
        ) {
          checklistValidation.setOpenRemarksFor(nextChecklist);
          checklistValidation.setPendingIncomingChecklistAfterStatus(null);
        }
      })
      .finally(() => {
        checklistValidation.setPendingStatusAfterChecklist(null);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to update status';
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      });
  }

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
    sortConfig: state.sortConfig,
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
    assignmentsCounts: state.assignmentsCounts,
    isActivitiesSidebarOpen: state.isActivitiesSidebarOpen,
    sseCandidates,
    sseAddedCountRef: state.sseAddedCountRef,
    isToday,
    isThisWeek,
    setAssignmentsCounts: state.setAssignmentsCounts,
    totalCountMembershipRef: state.totalCountMembershipRef,
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

  const handleCandidateCardClick = useCallback((candidate: Candidate) => {
    state.setSelectedCandidate(candidate);
    state.setIsCandidateDialogOpen(true);
  }, [state.setIsCandidateDialogOpen, state.setSelectedCandidate]);

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
        sortConfig={state.sortConfig}
        setSortConfig={state.setSortConfig}
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
          onCandidateCardClick={handleCandidateCardClick}
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
        setIsAssigning={() => { }}
        candidate={state.selectedCandidate}
        isOpen={state.isCandidateDialogOpen}
        onOpenChange={state.setIsCandidateDialogOpen}
        onViewDetails={(candidate) => {
          // Manual close and reopen to ensure fresh instance and avoid state mixed up
          state.setIsCandidateDialogOpen(false);
          state.setSelectedCandidate(null);

          setTimeout(() => {
            state.setSelectedCandidate(candidate);
            state.setIsCandidateDialogOpen(true);
          }, 100);
        }}
        onUpdate={(updatedCandidate) => {
          // Update local state with the updated candidate instead of refetching
          if (updatedCandidate && state.selectedCandidate?._id === updatedCandidate._id) {
            state.setSelectedCandidate((prev) => 
              prev?._id === updatedCandidate._id 
                ? { ...prev, ...updatedCandidate } 
                : updatedCandidate
            );
          }
        }}
        hideEditButton={user?.role === 'interviewer'}
        hideCloseButtons={false}
        onValidateStatusChange={checklistValidation.onValidateStatusChange}
        onDeferStatusToChecklist={checklistValidation.onDeferStatusToChecklist}
        onOpenChecklistAfterSave={checklistValidation.onOpenChecklistAfterSave}
      />

      {state.selectedCandidate && checklistValidation.openRemarksFor && (
        <ChecklistRemarksDialog
          candidate={state.selectedCandidate}
          isOpen={!!checklistValidation.openRemarksFor}
          onOpenChange={(open) => {
            if (!open) {
              checklistValidation.setOpenRemarksFor(null);
            }
          }}
          setOpenRemarksFor={checklistValidation.setOpenRemarksFor}
          refetch={async () => {
            // Optional: trigger assignment refetch after checklist completes
            triggerFetchAssignments({ page: 1, limit: itemsPerPage });
          }}
          checklistInfo={checklistValidation.openRemarksFor}
          onChecklistSuccess={handleChecklistComplete}
          onApplyDeferredStatus={handleApplyDeferredStatus}
          onChecklistCancel={() => {
            checklistValidation.setPendingStatusAfterChecklist(null);
            checklistValidation.setPendingIncomingChecklistAfterStatus(null);
            toast({
              title: 'Checklist cancelled',
              description: 'The checklist has been cancelled.',
              variant: 'destructive',
            });
          }}
        />
      )}
    </div>
  );
}
