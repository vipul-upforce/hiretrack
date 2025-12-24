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
import { evaluateCandidate } from '@/app/apply-jobs/ApplyAsGuest';
import dayjs from 'dayjs';
import { useAppSelector } from '@/lib/redux/hooks';
import { EvaluationResult } from '@/lib/ai-providers/evaluation-provider';
import { followUpSepretorPatternRegex } from '@/lib/constants';
import { useSSE } from '@/hooks/useSSE';
import { EditCandidateDialog } from './edit-candidate-dialog';
import { AssignCandidateDialog } from './assign-candidate-dialog';
import { AssignJobDialog } from './assign-job-dialog';
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
import AddFollowUpDialog from './add-followup-dialog';
import ConfirmAndRemarkDialog from './mark-as-done-dialog';
import { CandidateDetailsTabs } from './tabs/CandidateDetailsTabs';
import { CandidateDetailsActions } from './tabs/CandidateDetailsActions';
import { getJobId } from '../../utils/candidateAccessors';

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
}: CandidateDetailsDialogProps) {
  const pathname = usePathname();
  const id = useParams()?.id as string;

  const [refetchCandidate, { data: candidateData }] =
    useLazyFetchCandidatesQuery();
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
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [isAssigningJob, setIsAssigningJob] = useState(false);
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

  // useSSE already handles updating localCandidate when SSE updates arrive
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
  }, [activeTab, historyLoaded, localCandidate?._id]);

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
      localCandidate.history.length > 0 &&
      localCandidate._id === candidate?._id // Only merge if viewing this candidate
    ) {
      setTimeLineItems((prevItems) => {
        // Create a map of existing items by their unique identifier
        const existingItemsMap = new Map<string, ICandidateHistory>();
        prevItems.forEach((item) => {
          // Use a combination of dateTime and _id/remark.id as unique key
          const key = `${item.dateTime}-${item._id || item.remark?.id || ''}`;
          existingItemsMap.set(key, item);
        });

        if (!localCandidate.history) localCandidate.history = [];

        // Find new items that don't exist in current timeline
        const newItems = localCandidate.history.filter((newItem) => {
          const key = `${newItem.dateTime}-${newItem._id || newItem.remark?.id || ''}`;
          return !existingItemsMap.has(key);
        });

        // If there are new items, merge them
        if (newItems.length > 0) {
          // Combine existing and new items, then sort by dateTime (newest first)
          const merged = [...prevItems, ...newItems].sort(
            (a, b) =>
              new Date(b.dateTime ?? 0).getTime() -
              new Date(a.dateTime ?? 0).getTime(),
          );
          return merged;
        }

        // If no new items, check if any existing items were updated (e.g., remark was edited)
        const updatedItems = localCandidate.history
          .map((updatedItem) => {
            const key = `${updatedItem.dateTime}-${updatedItem._id || updatedItem.remark?.id || ''}`;
            const existing = existingItemsMap.get(key);
            if (existing) {
              // Item exists, return updated version
              return updatedItem;
            }
            return null;
          })
          .filter(Boolean) as ICandidateHistory[];

        if (updatedItems.length > 0) {
          // Replace updated items
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

        return prevItems;
      });
    }
  }, [localCandidate?.history, localCandidate?._id, candidate?._id]);

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

  // Reset history state when candidate changes
  useEffect(() => {
    if (candidate?._id !== localCandidate?._id) {
      setHistoryLoaded(false);
    }
  }, [localCandidate?._id, candidate?._id]);

  const refetch = async () => {
    setIsRefetching(true);
    const jobId = (id as string) || getJobId(candidate) || '';
    const result = await refetchCandidate(jobId);
    const updatedCandidate = result.data!.find(
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
    handleAddFollowUp,
    setNewFollowUp,
    setNewFollowUpDate,
    newFollowUp,
    newFollowUpDate,
    MADFollowup,
    setMADFollowup,
    handleRemoveFollowUp,
  } = useRemarkHandlers(
    localCandidate,
    user,
    refetch,
    refetchAssignment,
    onUpdate,
    refetchCandidates,
  );

  const {
    confirmUnassignOpen,
    setConfirmUnassignOpen,
    isLoading,
    handleUnassign,
    confirmUnassign,
  } = useUnassignHandlers(
    localCandidate,
    user,
    refetch,
    setLocalCandidate,
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

  useEffect(() => {
    if (isAddingFollowUp) {
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

      // use the most recent follow-up note for editing, or empty string
      const userNote =
        followUpParts.length > 0 ? followUpParts[followUpParts.length - 1] : '';
      setNewFollowUp(userNote);

      if (localCandidate?.followUp?.date) {
        setNewFollowUpDate(dayjs(localCandidate.followUp.date));
      } else {
        setNewFollowUpDate(null);
      }
    }
  }, [isAddingFollowUp, localCandidate]);

  useEffect(() => {
    if (candidate) {
      setLocalCandidate(candidate);
      // Reset history state when candidate changes
      setHistoryLoaded(false);
      // If candidate has history from SSE, initialize timeLineItems
      if (
        candidate.history &&
        Array.isArray(candidate.history) &&
        candidate.history.length > 0
      ) {
        setTimeLineItems(candidate.history);
        setHistoryLoaded(true);
      }
    }
  }, [candidate, id]);

  // Reset active tab when dialog opens or candidate changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen, candidate?._id]);

  if (!localCandidate) return null;

  const validTimeLineItems = timeLineItems.filter((item) => item.title !== '');
  const header = (
    <DialogHeader className="px-3 pr-8 pt-3 lg:px-4 lg:pr-10 lg:pt-4">
      {localCandidate && (
        <DetailsDialogHeader
          candidate={localCandidate}
          handleCandidateInfoCopy={handleCandidateInfoCopy}
          user={user}
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
          onAssignClick={() => setIsAssigning(true)}
        />
      )}
    </DialogHeader>
  );
  const body = (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CandidateDetailsTabs
        candidate={localCandidate}
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEditFollowUp={() => setIsAddingFollowUp(true)}
        onRemoveFollowUp={handleRemoveFollowUp}
        isReEvaluating={isReEvaluating}
        isEvaluatingFor={isEvaluatingFor}
        onReEvaluate={() => setConfirmReEvaluateOpen(true)}
        candidateHistory={historyData?.history || []}
        isHistoryLoading={isHistoryFetching}
        isRemarkSubmitting={isRemarkSubmitting}
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
          user={user}
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
          user={user}
          fromFilter={fromFilter || false}
          hideEditButton={hideEditButton}
          hideCloseButtons={hideCloseButtons}
          onAssign={() => setIsAssigning(true)}
          onUnassign={handleUnassign}
          onAddFollowUp={() => setIsAddingFollowUp(true)}
          onEdit={handleEditClick}
          onClose={() => {
            onOpenChange(false);
            setNewRemark('');
            setRemarkRating(null);
            setRemarkRatingHistory(null);
          }}
          onAssignJob={() => setIsAssigningJob(true)}
        />
      </div>
    </div>
  );

  return (
    <>
      <DetailsDialog
        open={isOpen && !isAssigning && !isEditing}
        onOpenChange={(e) => {
          setNewRemark('');
          setRemarkRating(null);
          setRemarkRatingHistory(null);
          onOpenChange(e);
        }}
      >
        {header}
        {body}

        {user?.role !== 'candidate' && footer}
      </DetailsDialog>
      {isAssigning && localCandidate && (
        <AssignCandidateDialog
          candidate={localCandidate}
          refetch={refetch}
          isOpen={isAssigning}
          onOpenChange={setIsAssigning}
          onUpdate={onUpdate || (() => {})}
          setLocalCandidate={setLocalCandidate}
          refetchAssignment={refetchAssignment}
          onSuccess={() => {
            if (pathname === '/dashboard/calendar') {
              setIsAssigning(false);
              onOpenChange(false);
            } else {
              refetch();
            }
          }}
        />
      )}
      {isAssigningJob && localCandidate && (
        <AssignJobDialog
          candidate={localCandidate}
          isOpen={isAssigningJob}
          onOpenChange={setIsAssigningJob}
          onJobAssignment={() => {
            refetchCandidates?.();
            onOpenChange(false);
            setIsAssigningJob(false);
          }}
        />
      )}
      {isAddingFollowUp && localCandidate && (
        <AddFollowUpDialog
          candidate={localCandidate}
          handleRemoveFollowUp={handleRemoveFollowUp}
          isOpen={isAddingFollowUp}
          onOpenChange={setIsAddingFollowUp}
          refetch={refetch}
          handleAddFollowUp={handleAddFollowUp}
          setNewFollowUp={setNewFollowUp}
          setNewFollowUpDate={setNewFollowUpDate}
          newFollowUp={newFollowUp}
          newFollowUpDate={newFollowUpDate}
          isLoading={isLoading}
          onAddingFollowup={async () => {
            setIsAddingFollowUp(false);
            setIsAddingFollowUp(false);
            setNewFollowUp('');
            setNewFollowUpDate(null);
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
      <ConfirmAndRemarkDialog
        title="Mark as Done"
        message="Candidate will be Un-Assigned after marking as done."
        isOpen={confirmUnassignOpen}
        setIsOpen={setConfirmUnassignOpen}
        onConfirm={(note, rating) => {
          confirmUnassign(note, rating);
        }}
        onCancel={() => setConfirmUnassignOpen(false)}
        isLoading={isLoading}
        loadingText="Marking as done..."
      />

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
