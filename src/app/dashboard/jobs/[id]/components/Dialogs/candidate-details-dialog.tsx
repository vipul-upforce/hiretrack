'use client';

import { DialogHeader } from '@/components/ui/dialog';
import logger from '@/lib/logger';
import { Candidate } from '@/types/candidate';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  useEvaluateCandidateMutation,
  useLazyFetchCandidatesQuery,
  useLazyFetchCandidateHistoryQuery,
} from '@/lib/features/candidate/candidateApi';
import { useParams, usePathname } from 'next/navigation';
import { ICandidateHistory } from '@/lib/models/history';
import dayjs from 'dayjs';
import { useAppSelector } from '@/lib/redux/hooks';
import { EvaluationResult } from '@/lib/ai-providers/evaluation-provider';
import { followUpSepretorPatternRegex } from '@/lib/constants';
import { useSSE } from '@/hooks/useSSE';
import { evaluateCandidate } from '@/app/apply-jobs/utils/guestApplicationUtils';
import { CandidateActionType } from '@/components/unified-candidate-dialog/types';
import { EditCandidateDialog } from './edit-candidate-dialog';
import { UnifiedCandidateActionsDialog } from './unified-candidate-actions-dialog';
import { CandidateDetailsDialogProps } from '../../schemas/candidateDetailsDialogProps';
import { IEditRemark } from '../../schemas/EditRemarkDialog';
import EditRemarkDialog from './EditRemarkDialog';
import ConfirmationDialog from './ConfirmationDialog';
import handleCandidateInfoCopy from '../../hooks/handleCandidateInfoCopy';
import DetailsDialogHeader from '../Candidate/candidate-details-header';
import RemarkInputSection from '../Remarks/RemarkInputSection';
import { useRemarkHandlers } from '../../hooks/useRemarkHandlers';
import { useUnassignHandlers } from '../../hooks/useUnassignHandlers';
import { DetailsDialog } from './DetailsDialog';
import { CandidateDetailsTabs } from './tabs/CandidateDetailsTabs';
import { CandidateDetailsActions } from './tabs/CandidateDetailsActions';
import { getJobId } from '../../utils/candidateAccessors';
/* eslint-disable max-lines */

export function CandidateDetailsDialog({
  candidate,
  isOpen,
  onOpenChange,
  onUpdate,
  hideEditButton = false,
  refetchAssignment,
  fromFilter,
  refetchCandidates,
  hideCloseButtons = false,
  isAssigning,
}: CandidateDetailsDialogProps) {
  const pathname = usePathname();
  const id = useParams()?.id as string;

  const [refetchCandidate] = useLazyFetchCandidatesQuery();
  const [
    fetchHistory,
    {
      data: historyData,
      isFetching: isHistoryFetching,
      isError: isHistoryError,
    },
  ] = useLazyFetchCandidateHistoryQuery();

  const [isEditing, setIsEditing] = useState(false);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [isUnifiedOpen, setIsUnifiedOpen] = useState(false);
  const [unifiedInitialAction, setUnifiedInitialAction] = useState<
    CandidateActionType | undefined
  >(undefined);
  const { user } = useAppSelector((state) => state.auth || {});
  const [evaluateCandidateMutation] = useEvaluateCandidateMutation();
  const [confirmReEvaluateOpen, setConfirmReEvaluateOpen] = useState(false);
  const [isEditRemarkDialogOpen, setIsEditRemarkDialogOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState<IEditRemark | null>(null);
  const [timeLineItems, setTimeLineItems] = useState<ICandidateHistory[]>([]);
  const [isEvaluatingFor, setIsEvaluatingFor] = useState<string | null>(null);
  const [localCandidate, setLocalCandidate] = useState<Candidate | null>(
    candidate,
  );
  const [activeTab, setActiveTab] = useState('overview');

  // History loading state
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  // useSSE handles updating localCandidate when SSE updates arrive
  useSSE(setLocalCandidate, localCandidate || null, id);

  // Load history when history tab is activated
  useEffect(() => {
    if (
      (activeTab === 'history' || activeTab === 'logs') &&
      !historyLoaded &&
      localCandidate?._id
    ) {
      fetchHistory(localCandidate._id);
    }
  }, [activeTab, historyLoaded, localCandidate?._id, fetchHistory]);

  useEffect(() => {
    if (historyData?.history) {
      setHistoryLoaded(true);
      setTimeLineItems(historyData.history);
    }
  }, [historyData]);

  // Merge SSE history updates into timeLineItems without refetching
  // Watch localCandidate?.history because useSSE updates localCandidate when SSE arrives
  useEffect(() => {
    if (
      localCandidate?.history &&
      Array.isArray(localCandidate.history) &&
      localCandidate._id === candidate?._id // Only merge if viewing this candidate
    ) {
      // Store history in a const to help TypeScript narrow the type
      const sseHistory = localCandidate.history;

      setTimeLineItems((prevItems) => {
        // CRITICAL: If history is already loaded and SSE history is smaller,
        // it might be incomplete - preserve existing items
        if (
          historyLoaded &&
          prevItems.length > 0 &&
          sseHistory.length < prevItems.length
        ) {
          // SSE history is smaller than what we have - likely incomplete
          // Only merge new/updated items, don't replace everything
          const existingItemsMap = new Map<string, ICandidateHistory>();
          prevItems.forEach((item) => {
            const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
            existingItemsMap.set(key, item);
          });

          // Find new items that don't exist in current timeline
          const newItems = sseHistory.filter((newItem) => {
            const key = `${newItem.dateTime}-${newItem._id || newItem.remark?.id || ''}`;
            return !existingItemsMap.has(key);
          });

          // If there are new items, merge them
          if (newItems.length > 0) {
            const merged = [...prevItems, ...newItems].sort(
              (a, b) =>
                new Date(b.dateTime ?? 0).getTime() -
                new Date(a.dateTime ?? 0).getTime(),
            );
            return merged;
          }

          // Check if any existing items were updated
          const updatedItems = sseHistory
            .map((updatedItem) => {
              const key = `${updatedItem.dateTime}-${updatedItem._id || updatedItem.remark?.id || ''}`;
              const existing = existingItemsMap.get(key);
              if (existing) {
                return updatedItem;
              }
              return null;
            })
            .filter(Boolean) as ICandidateHistory[];

          if (updatedItems.length > 0) {
            const updatedMap = new Map<string, ICandidateHistory>();
            updatedItems.forEach((item) => {
              const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
              updatedMap.set(key, item);
            });

            return prevItems
              .map((item) => {
                const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
                return updatedMap.get(key) || item;
              })
              .sort(
                (a, b) =>
                  new Date(b.dateTime ?? 0).getTime() -
                  new Date(a.dateTime ?? 0).getTime(),
              );
          }

          // Preserve existing items if SSE history is incomplete
          return prevItems;
        }

        // History not loaded yet, or SSE history is complete - use it
        if (sseHistory.length > 0) {
          // Create a map of existing items
          const existingItemsMap = new Map<string, ICandidateHistory>();
          prevItems.forEach((item) => {
            const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
            existingItemsMap.set(key, item);
          });

          // Find new items
          const newItems = sseHistory.filter((newItem) => {
            const key = `${newItem.dateTime}-${newItem._id || newItem.remark?.id || ''}`;
            return !existingItemsMap.has(key);
          });

          if (newItems.length > 0) {
            const merged = [...prevItems, ...newItems].sort(
              (a, b) =>
                new Date(b.dateTime ?? 0).getTime() -
                new Date(a.dateTime ?? 0).getTime(),
            );
            return merged;
          }

          // Check for updated items
          const updatedItems = sseHistory
            .map((updatedItem) => {
              const key = `${updatedItem.dateTime}-${updatedItem._id || updatedItem.remark?.id || ''}`;
              const existing = existingItemsMap.get(key);
              if (existing) {
                return updatedItem;
              }
              return null;
            })
            .filter(Boolean) as ICandidateHistory[];

          if (updatedItems.length > 0) {
            const updatedMap = new Map<string, ICandidateHistory>();
            updatedItems.forEach((item) => {
              const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
              updatedMap.set(key, item);
            });

            return prevItems
              .map((item) => {
                const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
                return updatedMap.get(key) || item;
              })
              .sort(
                (a, b) =>
                  new Date(b.dateTime ?? 0).getTime() -
                  new Date(a.dateTime ?? 0).getTime(),
              );
          }

          // If SSE history is same or larger, use it (might be complete)
          if (sseHistory.length >= prevItems.length) {
            return sseHistory.sort(
              (a, b) =>
                new Date(b.dateTime ?? 0).getTime() -
                new Date(a.dateTime ?? 0).getTime(),
            );
          }

          return prevItems;
        }

        return prevItems;
      });
    }
  }, [
    localCandidate?.history,
    localCandidate?._id,
    candidate?._id,
    historyLoaded,
  ]);

  // Handle History Error
  useEffect(() => {
    if (isHistoryError && !isRefetching) {
      toast({
        title: 'Error',
        description: 'Failed to load candidate history',
        variant: 'destructive',
      });
    }
  }, [isHistoryError, isRefetching]);

  // Note: History and details reset is now handled in the candidate prop useEffect below

  const refetch = async () => {
    setIsRefetching(true);
    const jobId = (id as string) || getJobId(candidate) || '';
    const result = await refetchCandidate(jobId);
    const updatedCandidate = result.data?.find(
      (c) => c._id === localCandidate?._id,
    );

    // Only fetch updated history if it's not already loaded via SSE
    // This prevents unnecessary refetches when SSE has already updated the data
    if (
      historyLoaded &&
      localCandidate?._id &&
      !localCandidate?.history?.length
    ) {
      await fetchHistory(localCandidate._id);
    }

    // Update local candidate with the new data
    if (updatedCandidate) {
      setLocalCandidate({
        ...updatedCandidate,
        history: historyData?.history || localCandidate?.history || [],
      });
    }
    setIsRefetching(false);
  };

  const {
    newRemark,
    setNewRemark,
    remarkRating,
    setRemarkRating,
    setRemarkRatingHistory,
    isSubRemarkPrivate,
    setIsSubRemarkPrivate,
    handleRemarkUpdate,
    isRemarkSubmitting,
    handleAddRemark,
    setNewFollowUp,
    setNewFollowUpDate,
    setMADFollowup,
    handleRemoveFollowUp,
    isFollowUpSubmitting,
  } = useRemarkHandlers(
    localCandidate,
    refetchAssignment,
    onUpdate,
    refetchCandidates,
  );

  const { isLoading } = useUnassignHandlers(
    localCandidate,
    refetch,
    setLocalCandidate as (c: Candidate) => void,
    onUpdate,
    refetchAssignment,
    onOpenChange,
  );

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleReEvaluation = async () => {
    setConfirmReEvaluateOpen(false);
    try {
      setIsReEvaluating(true);
      setIsEvaluatingFor(localCandidate?._id as string);
      const result: {
        candidate?: EvaluationResult;
      } = (await evaluateCandidate(
        localCandidate?._id as string,
        evaluateCandidateMutation,
      )) as {
        candidate?: EvaluationResult;
      };
      if (!result.candidate) {
        return toast({
          title: 'Error',
          description: (result as string) || 'Failed to Re-evaluate the resume',
          variant: 'destructive',
        });
      }
      toast({
        title: 'Success',
        description: 'Candidate re-evaluation completed successfully',
        variant: 'default',
      });
    } catch (error) {
      logger.error('Re-evaluation error:', error);
      toast({
        title: 'Error',
        description: (error as string) || 'Failed to re-evaluate candidate',
        variant: 'destructive',
      });
    } finally {
      setIsReEvaluating(false);
    }
    return candidate;
  };

  const handleReEvaluationClick = () => {
    // Check if candidate already has AI scores (indicating previous evaluation)
    const hasExistingScores =
      localCandidate?.scores &&
      (localCandidate.scores.overall !== undefined ||
        localCandidate.scores.experience !== undefined ||
        localCandidate.scores.skills !== undefined ||
        localCandidate.scores.affordability !== undefined);

    if (hasExistingScores && !confirmReEvaluateOpen) {
      // Show confirmation dialog for re-evaluation
      setConfirmReEvaluateOpen(true);
    } else {
      // First time evaluation - proceed directly
      handleReEvaluation();
    }
  };

  useEffect(
    () => () => {
      setNewRemark('');
      setRemarkRating(0);
      setRemarkRatingHistory(0);
    },
    [],
  );

  const isFollowUpMode =
    isUnifiedOpen && unifiedInitialAction === 'addFollowUp';

  useEffect(() => {
    if (!isFollowUpMode) return;

    const parts = localCandidate?.followUp?.note
      ? localCandidate.followUp.note
          .split(followUpSepretorPatternRegex)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    const followUpParts = parts.filter((p) => {
      if (p.endsWith('has completed the last step.')) {
        setMADFollowup(p);
        return false;
      }
      return true;
    });

    const userNote =
      followUpParts.length > 0 ? followUpParts[followUpParts.length - 1] : '';
    setNewFollowUp(userNote);

    if (localCandidate?.followUp?.date) {
      setNewFollowUpDate(dayjs(localCandidate.followUp.date));
    } else {
      setNewFollowUpDate(null);
    }
  }, [isFollowUpMode, localCandidate]);

  useEffect(() => {
    if (candidate) {
      const isSameCandidate = candidate._id === localCandidate?._id;
      
      // CRITICAL FIX: Preserve assignment from localCandidate when merging with candidate prop
      // This prevents stale candidate prop from overwriting fresh assignment updates
      if (isSameCandidate && localCandidate?.assignment) {
        // Same candidate - preserve assignment from localCandidate (which may have been updated via SSE/refetch)
        // Merge other fields from candidate prop
        setLocalCandidate({
          ...candidate,
          assignment: localCandidate.assignment, // Preserve the assignment from localCandidate
          history: localCandidate.history || candidate.history, // Preserve history too
        });
      } else {
        // Different candidate or no localCandidate - use candidate prop as-is
        setLocalCandidate(candidate);
      }

      // Only reset history state when candidate ID actually changes
      if (!isSameCandidate) {
        setHistoryLoaded(false);
        // Initialize timeLineItems from candidate history if available
        if (
          candidate.history &&
          Array.isArray(candidate.history) &&
          candidate.history.length > 0
        ) {
          setTimeLineItems(candidate.history);
          setHistoryLoaded(true);
        } else {
          setTimeLineItems([]);
        }
      } else if (
        !historyLoaded &&
        candidate.history &&
        Array.isArray(candidate.history) &&
        candidate.history.length > 0
      ) {
        // Same candidate - don't reset historyLoaded or overwrite timeLineItems
        // The merge logic in the other useEffect will handle SSE updates
        // Only initialize if history hasn't been loaded yet
        setTimeLineItems(candidate.history);
        setHistoryLoaded(true);
      }
    }
  }, [candidate, id, localCandidate?._id, historyLoaded]);

  // Check if interviewer can access this candidate
  const canInterviewerAccess = () => {
    if (user?.role !== 'interviewer') return true; // Non-interviewers can access
    if (!localCandidate?.assignment?.interviewerId) return false; // No assignment means can't access

    const interviewerId =
      typeof localCandidate.assignment.interviewerId === 'object'
        ? localCandidate.assignment.interviewerId._id
        : localCandidate.assignment.interviewerId;

    return interviewerId === user.id;
  };

  // Close dialog if interviewer loses access
  useEffect(() => {
    if (isOpen && user?.role === 'interviewer' && !canInterviewerAccess()) {
      onOpenChange(false);
    }
  }, [
    isOpen,
    user?.role,
    localCandidate?.assignment?.interviewerId,
    user?.id,
    onOpenChange,
  ]);

  if (!localCandidate) return null;

  const validTimeLineItems = timeLineItems
    .filter((item) => item.title !== '')
    .map((item) => {
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        if (item.note && item.note.isPrivate) {
          return {
            ...item,
            note: {
              ...item.note,
              description: '',
            },
          };
        }
      }
      return item;
    });
  const header = (
    <DialogHeader className="px-3 pr-8 pt-3 lg:px-4 lg:pr-10 lg:pt-4">
      {localCandidate && (
        <DetailsDialogHeader
          candidate={localCandidate}
          handleCandidateInfoCopy={handleCandidateInfoCopy}
          refetch={async () => {
            if (
              pathname !== '/dashboard' &&
              pathname !== '/dashboard/calendar'
            ) {
              await refetch();
            } else {
              await refetchAssignment?.();
            }
          }}
          onAssignClick={() => {
            setUnifiedInitialAction('assignTo');
            setIsUnifiedOpen(true);
          }}
        />
      )}
    </DialogHeader>
  );
  const body = (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CandidateDetailsTabs
        candidate={localCandidate}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEditFollowUp={() => {
          setUnifiedInitialAction('addFollowUp');
          setIsUnifiedOpen(true);
        }}
        onRemoveFollowUp={handleRemoveFollowUp}
        isReEvaluating={isReEvaluating}
        isEvaluatingFor={isEvaluatingFor}
        onReEvaluate={() => setConfirmReEvaluateOpen(true)}
        isHistoryLoading={isHistoryFetching}
        isRemarkSubmitting={isRemarkSubmitting}
        isFollowUpSubmitting={isFollowUpSubmitting}
        validTimeLineItems={validTimeLineItems}
        handleRemarkUpdate={handleRemarkUpdate}
        setEditingRemark={setEditingRemark}
        setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        historyLoaded={historyLoaded}
      />
    </div>
  );
  const footer = (
    <div className="flex flex-col space-y-4 bg-background px-6 py-4 pt-0">
      {/* Remark Input Section - Always visible */}
      {user?.role !== 'candidate' && (
        <RemarkInputSection
          newRemark={newRemark}
          setNewRemark={setNewRemark}
          remarkRating={remarkRating}
          setRemarkRating={setRemarkRating}
          setRemarkRatingHistory={setRemarkRatingHistory}
          isSubRemarkPrivate={isSubRemarkPrivate}
          setIsSubRemarkPrivate={setIsSubRemarkPrivate}
          localCandidate={candidate}
          handleRemoveFollowUp={handleRemoveFollowUp}
          handleAddRemark={handleAddRemark}
          isRemarkSubmitting={isRemarkSubmitting}
        />
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2 border-t border-gray-200 pt-4 dark:border-gray-700">
        <CandidateDetailsActions
          candidate={localCandidate}
          fromFilter={fromFilter || false}
          hideEditButton={hideEditButton}
          hideCloseButtons={hideCloseButtons}
          onAssign={() => {
            setUnifiedInitialAction('assignTo');
            setIsUnifiedOpen(true);
          }}
          onUnassign={() => {
            setUnifiedInitialAction('markAsDone');
            setIsUnifiedOpen(true);
          }}
          onAddFollowUp={() => {
            setUnifiedInitialAction('addFollowUp');
            setIsUnifiedOpen(true);
          }}
          onEdit={handleEditClick}
          onClose={() => {
            onOpenChange(false);
            setNewRemark('');
            setRemarkRating(null);
            setRemarkRatingHistory(null);
          }}
          onAssignJob={() => {
            setUnifiedInitialAction('switchJob');
            setIsUnifiedOpen(true);
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <DetailsDialog
        open={isOpen && !isAssigning && !isEditing && canInterviewerAccess()}
        onOpenChange={(e) => {
          setNewRemark('');
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          onOpenChange(e);
        }}
      >
        {header}
        {body}

        {(user?.role !== 'candidate' || !user?.role) && footer}
      </DetailsDialog>
      {localCandidate && (
        <UnifiedCandidateActionsDialog
          candidate={localCandidate}
          isOpen={isUnifiedOpen}
          onOpenChange={setIsUnifiedOpen}
          initialAction={unifiedInitialAction}
          refetch={refetch}
          onUpdate={onUpdate || (() => {})}
          setLocalCandidate={setLocalCandidate}
          refetchAssignment={refetchAssignment}
          onSuccess={async () => {
            await refetch();
            setUnifiedInitialAction(undefined);
            // Close candidate details dialog if interviewer marked as done
            if (
              unifiedInitialAction === 'markAsDone'
            ) {
              onOpenChange(false);
            }
          }}
        />
      )}
      {isEditing && localCandidate && (
        <EditCandidateDialog
          candidate={localCandidate}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onUpdate={onUpdate || (() => {})}
          refetchAssignment={refetchAssignment}
          onSuccess={async () => {
            await refetch();
          }}
          reopenDetailsDialog={() => {
            onOpenChange(true);
          }}
        />
      )}
      <ConfirmationDialog
        title="Re-evaluate Candidate with AI?"
        message="This will use your active AI provider to re-analyze the candidate's resume and may incur additional costs based on your AI provider's pricing. The existing evaluation scores will be overwritten with new results."
        isOpen={confirmReEvaluateOpen}
        setIsOpen={setConfirmReEvaluateOpen}
        onConfirm={handleReEvaluationClick}
        onCancel={() => setConfirmReEvaluateOpen(false)}
        isLoading={isLoading}
        loadingText="Re-Evaluating with AI..."
        className="sm:max-w-[500px]"
      />
      <EditRemarkDialog
        isEditRemarkDialogOpen={isEditRemarkDialogOpen}
        setIsEditRemarkDialogOpen={setIsEditRemarkDialogOpen}
        editingRemark={editingRemark}
        setEditingRemark={setEditingRemark}
        handleRemarkUpdate={handleRemarkUpdate}
        isLoading={isLoading}
        setRemarkRating={setRemarkRating}
        setRemarkRatingHistory={setRemarkRatingHistory}
      />
    </>
  );
}
