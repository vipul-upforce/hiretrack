/* eslint-disable max-lines */

import { DropResult, type DragStart } from '@hello-pangea/dnd';
import { toast } from '@/hooks/use-toast';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import type React from 'react';
import { useState, useRef, useCallback } from 'react';
import {
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useBulkUpdateCandidatesMutation,
} from '@/lib/features/candidate/candidateApi';
import { useBulkSubmitChecklistMutation } from '@/lib/features/checklist/checklistApi';
import { getCandidateStatusLabel } from '../utils/candidateAccessors';
import { useUpdateLanesMutation } from '@/lib/features/lane/laneApi';
import { useSendStatusMailMutation } from '@/lib/features/org/orgApi';
import { sentStatusMailHandler } from '@/lib/utils';
import { Job } from '@/types/job';
import type { ChecklistSubmissionData } from '@/types/checklist';
import logger from '@/lib/logger';
import { IJobLaneConfig } from '@/lib/models/JobLaneConfig';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { clearSelectedCandidates } from '@/lib/redux/selectedCandidatesSlice';
import DndSyncLock from '@/lib/dndlock';
import { useClientSideChecklistValidation } from './useClientSideChecklistValidation';
// import { stringifyBulkReasonPayload } from '../components/Dialogs/bulk-reason-dialog';
// import DndSyncLock from '@/lib/dndlock';
import { stringifyBulkReasonPayload } from '../components/Dialogs/bulk-reason-dialog';

function isDragCandidateSnapshot(
  candidate: Candidate | undefined,
): candidate is Candidate {
  return Boolean(
    candidate?._id &&
      typeof candidate.name === 'string' &&
      candidate.name.trim().length > 0,
  );
}

/** When set, checklist success should apply this status update (e.g. after deferring from unified dialog) */
export interface PendingStatusAfterChecklist {
  candidateId: string;
  newStatus: string;
}

interface UseCandidateProps {
  columns: CandidateColumn[];
  setColumns: (columns: CandidateColumn[]) => void;
  setOpenRemarksFor: (id: string | null) => void;
  setIsDialogOpen: (open: boolean) => void;
  setDroppedFileData: (file: File | null) => void;
  setCandidateToDelete: (id: string | null) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  selectedCandidate: Candidate | null;
  refetch: () => Promise<unknown>;
  candidateToDelete: string | null;
  jobLaneConfig?: IJobLaneConfig;
  job?: Job;
  /** When checklist was opened from unified-dialog status update; on checklist success apply this status */
  pendingStatusAfterChecklist?: PendingStatusAfterChecklist | null;
  setPendingStatusAfterChecklist?: (
    v: PendingStatusAfterChecklist | null,
  ) => void;
  /** When set, after applying deferred status open this checklist (second of two from unified dialog) */
  pendingIncomingChecklistAfterStatus?: string | null;
  setPendingIncomingChecklistAfterStatus?: (v: string | null) => void;
  /** After applying deferred status (single or bulk), call so page can process next in bulk queue */
  onBulkQueueStepComplete?: () => void;
  /** Current bulk status queue; used so checklist complete can advance queue for optional bulk items */
  bulkStatusQueue?:
    | { candidateId: string; newStatus: string; validationInfo?: string }[]
    | null;
  onLaneRefetch?: (
    laneIdOrLanes: string | string[],
    candidateId?: string,
    updatedCandidate?: Candidate,
  ) => void;
  onLaneRefetchCurrentPage?: (
    laneId: string,
    candidateId?: string,
    updatedCandidate?: Candidate,
  ) => void;
  /** Resolve a candidate visible in cursor lanes (page 2+) not on grouped page-1. */
  resolveCandidateForDrag?: (candidateId: string) => Candidate | undefined;
  /** Called when a cross-lane status move starts so the page can optimistically map the candidate to the target lane. */
  onPendingStatusMove?: (
    candidateId: string,
    status: string,
    candidateSnapshot?: Candidate,
  ) => void;
  /** When true, grouped kanban refetches after cross-lane drag (strictApiOnly card lists). */
  filtersActive?: boolean;
  /** When set, hook will assign { remove, candidateId, targetStatus } when a cross-lane drag adds dnd-updating. Page calls remove() when mergedCandidates reflects the move (Option B: remove dnd-updating only when data is correct). */
  dndUpdateCompleteRef?: React.MutableRefObject<{
    remove: () => void;
    candidateId: string;
    targetStatus: string;
  } | null>;
}
/** When clubbing candidates with same two checklists (outgoing + incoming), one dialog per phase with bulk-submit for all */
export interface BulkDragTwoPhaseState {
  phase: 'outgoing' | 'incoming';
  candidateIds: string[];
  sourceLaneId: string;
  targetLaneId: string;
  /** When true, status was already applied before the checklist (optional checklists) — skip status update on submit */
  statusAlreadyApplied?: boolean;
}

interface PendingMove {
  candidateId: string;
  sourceLaneId: string;
  targetLaneId: CandidateStatus;
  sourceIndex: number;
  targetIndex: number;
}

interface PendingChecklist {
  candidateId: string;
  currentLane: string;
  targetLane: string;
  checklist: unknown;
  isMandatory: boolean;
  checklistType: 'incoming' | 'outgoing';
  /** When true, status was already applied before opening the first (optional) checklist; submit must not PUT. */
  statusAlreadyApplied?: boolean;
}
/** One candidate's "first checklist" in bulk mandatory flow; after they complete both, we open next candidate's first */
interface BulkChecklistQueueItem {
  candidateId: string;
  sourceLaneId: string;
  targetLaneId: string;
  validationInfo: string;
  pendingValidationInfo: string | null;
  sourceIndex: number;
  targetIndex: number;
}
export const useCandidate = ({
  columns,
  setColumns,
  setOpenRemarksFor,
  setIsDialogOpen,
  setDroppedFileData,
  setCandidateToDelete,
  setIsDeleteDialogOpen,
  setSelectedCandidate,
  selectedCandidate,
  refetch,
  candidateToDelete,
  jobLaneConfig,
  job,
  pendingStatusAfterChecklist,
  setPendingStatusAfterChecklist,
  pendingIncomingChecklistAfterStatus,
  setPendingIncomingChecklistAfterStatus,
  onBulkQueueStepComplete,
  bulkStatusQueue,
  onLaneRefetch,
  onLaneRefetchCurrentPage,
  resolveCandidateForDrag,
  onPendingStatusMove,
  filtersActive = false,
}: UseCandidateProps) => {
  const [updateCandidate] = useUpdateCandidateMutation();
  const [bulkUpdateCandidates] = useBulkUpdateCandidatesMutation();
  const [deleteCandidate] = useDeleteCandidateMutation();
  const [updateLanes] = useUpdateLanesMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [pendingChecklists, setPendingChecklists] = useState<
    PendingChecklist[]
  >([]);
  const [_bulkChecklistQueue, setBulkChecklistQueue] = useState<
    BulkChecklistQueueItem[]
  >([]);
  const bulkMandatoryCandidateIdsRef = useRef<Set<string> | null>(null);
  const bulkMandatoryStatusAppliedRef = useRef<boolean>(false);
  const [bulkDragTwoPhase, setBulkDragTwoPhase] =
    useState<BulkDragTwoPhaseState | null>(null);
  const bulkDragIncomingValidationInfoRef = useRef<string | null>(null);
  /** True when incoming checklist is mandatory (hold status update until after incoming submit); false when optional (update status then show incoming). */
  const bulkDragIncomingIsMandatoryRef = useRef<boolean>(false);
  const [bulkSubmitChecklist] = useBulkSubmitChecklistMutation();

  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const selectedCandidates = useAppSelector(
    (state) => state.selectedCandidates?.candidates ?? [],
  );

  /** Bulk drag: when user drags a selected candidate, move all selected. Ref used in onDragEnd. */
  const bulkDragRef = useRef<{ draggedId: string; bulkIds: string[] } | null>(
    null,
  );
  const [bulkDragState, setBulkDragState] = useState<{
    isBulkDrag: boolean;
    draggedId: string | null;
    bulkIds: string[];
  }>({ isBulkDrag: false, draggedId: null, bulkIds: [] });

  const onBeforeDragStart = useCallback(
    (start: DragStart) => {
      if (start.type !== 'candidate') return;
      const isSelected = selectedCandidates.some(
        (c) => c._id === start.draggableId,
      );
      if (!isSelected || selectedCandidates.length <= 1) return;
      const bulkIds = selectedCandidates.map((c) => c._id);
      bulkDragRef.current = { draggedId: start.draggableId, bulkIds };
      setBulkDragState({
        isBulkDrag: true,
        draggedId: start.draggableId,
        bulkIds,
      });
    },
    [selectedCandidates],
  );

  // Initialize client-side checklist validation
  const {
    validateCompleteMovement,
    validateMovement,
  } = useClientSideChecklistValidation(jobLaneConfig, user?.role);

  // Config-only checklist validation:
  // ignore candidate.checklistData completion state so we don't skip opening dialogs
  // when checklistData is stale/missing for some paginated candidates.
  const {
    validateCompleteMovement: validateCompleteMovementConfigOnly,
  } = useClientSideChecklistValidation(jobLaneConfig, user?.role, {
    skipAlreadyCompletedCheck: true,
  });

  // Function to complete a pending move (move card and update database)
  const completePendingMove = async (candidateId: string) => {
    const pendingMove = pendingMoves.find(
      (pm) => pm.candidateId === candidateId,
    );
    if (!pendingMove) return;

    try {
      // Update the UI - move the card to target lane
      // Extract the logic outside setColumns
      const prevColumns = columns;
      const newColumns = [...prevColumns];
      const sourceColumnIndex = newColumns.findIndex(
        (col) => col.id === pendingMove.sourceLaneId,
      );
      const targetColumnIndex = newColumns.findIndex(
        (col) => col.id === pendingMove.targetLaneId,
      );

      if (sourceColumnIndex >= 0 && targetColumnIndex >= 0) {
        const sourceColumn = newColumns[sourceColumnIndex];
        const targetColumn = newColumns[targetColumnIndex];

        // Find and remove candidate from source
        const candidateToMove = sourceColumn.candidates.find(
          (c) => c._id === candidateId,
        );
        if (candidateToMove) {
          const newSourceCandidates = sourceColumn.candidates.filter(
            (candidate) => candidate._id !== candidateId,
          );

          // Add candidate to target with updated status
          const newTargetCandidates = [...targetColumn.candidates];
          newTargetCandidates.splice(pendingMove.targetIndex, 0, {
            ...candidateToMove,
            status: pendingMove.targetLaneId,
          });

          newColumns[sourceColumnIndex] = {
            ...sourceColumn,
            candidates: newSourceCandidates,
          };

          newColumns[targetColumnIndex] = {
            ...targetColumn,
            candidates: newTargetCandidates,
          };
        }
      }

      // Pass the final newColumns to setColumns
      setColumns(newColumns);

      // If this candidate is part of a bulk mandatory set, status has already
      // been (or will be) applied via bulkUpdateCandidates in the bulk flow.
      // In that case, skip per-candidate PUT and rely on SSE + bulk APIs.
      const bulkMandatoryIds = bulkMandatoryCandidateIdsRef.current;
      const isBulkMandatory =
        bulkMandatoryIds !== null && bulkMandatoryIds.has(candidateId);

      if (!isBulkMandatory) {
        // Single candidate: use PUT (bulk-update only when multiple selected candidates move)
        const updatedCandidate = await updateCandidate({
          _id: candidateId,
          status: pendingMove.targetLaneId,
        }).unwrap();

        // Send status change email notification
        sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: pendingMove.sourceLaneId,
          },
          sendStatusMail,
          { remark: '' },
        );
      }

      // Remove from pending moves
      setPendingMoves((prev) =>
        prev.filter((pm) => pm.candidateId !== candidateId),
      );

      // Rely on mutation invalidation to refetch job-level candidates; avoid per-lane fetches (they duplicate the job-level request).
      if (!onLaneRefetch) {
        await refetch();
      }
    } catch {
      // If database update fails, don't move the card
      toast({
        title: 'Error',
        description: 'Failed to update candidate status',
        variant: 'destructive',
      });
    }
  };

  // Function to cancel a pending move (just remove from pending moves)
  const cancelPendingMove = (candidateId: string) => {
    const bulkIds = bulkMandatoryCandidateIdsRef.current;
    if (bulkIds) {
      setPendingMoves((prev) =>
        prev.filter((pm) => !bulkIds.has(pm.candidateId)),
      );
      setPendingChecklists((prev) =>
        prev.filter((pc) => !bulkIds.has(pc.candidateId)),
      );
      setBulkChecklistQueue([]);
      setBulkDragTwoPhase(null);
      bulkDragIncomingValidationInfoRef.current = null;
      bulkDragIncomingIsMandatoryRef.current = false;
      bulkMandatoryCandidateIdsRef.current = null;
      bulkMandatoryStatusAppliedRef.current = false;
      setOpenRemarksFor(null);
      dispatch(clearSelectedCandidates());
      return;
    }
    setPendingMoves((prev) =>
      prev.filter((pm) => pm.candidateId !== candidateId),
    );
    // Also clear any pending checklists for this candidate
    setPendingChecklists((prev) =>
      prev.filter((pc) => pc.candidateId !== candidateId),
    );
  };

  // Handler for when a checklist is successfully completed - show next checklist if queued
  const handleChecklistComplete = (candidateId: string) => {
    // Bulk status queue (multi-candidate flow): status was already handled via bulk APIs.
    // Do NOT issue a per-candidate PUT here; just advance the queue.
    if (
      bulkStatusQueue?.length &&
      bulkStatusQueue[0].candidateId === candidateId
    ) {
      onBulkQueueStepComplete?.();
      return;
    }

    // Status was deferred from unified dialog (single-candidate flow only); apply via PUT.
    if (
      pendingStatusAfterChecklist?.candidateId === candidateId &&
      setPendingStatusAfterChecklist
    ) {
      const { newStatus } = pendingStatusAfterChecklist;

      updateCandidate({
        _id: candidateId,
        status: newStatus as CandidateStatus,
      })
        .unwrap()
        .then(() => refetch())
        .then(() => {
          // So details dialog (if open) shows the new status instead of reverting
          if (selectedCandidate && selectedCandidate._id === candidateId) {
            setSelectedCandidate({
              ...selectedCandidate,
              status: newStatus as CandidateStatus,
            });
          }
        })
        .then(() => {
          // Open second (incoming) checklist if deferred from unified two-step flow
          if (
            pendingIncomingChecklistAfterStatus &&
            setOpenRemarksFor &&
            setPendingIncomingChecklistAfterStatus
          ) {
            setOpenRemarksFor(pendingIncomingChecklistAfterStatus);
            setPendingIncomingChecklistAfterStatus(null);
          }
        })
        .finally(() => {
          setPendingStatusAfterChecklist(null);
          onBulkQueueStepComplete?.();
        });
      return;
    }

    const pendingChecklist = pendingChecklists.find(
      (pc) => pc.candidateId === candidateId,
    );

    if (pendingChecklist) {
      // Remove from pending checklists queue
      setPendingChecklists((prev) =>
        prev.filter((pc) => pc.candidateId !== candidateId),
      );

      // Show the pending (incoming) checklist after this dialog closes; defer so dialog's onSuccess
      // does not overwrite with setOpenRemarksFor('') before the next checklist is shown.
      const validationInfo = {
        candidateId: pendingChecklist.candidateId,
        currentLane: pendingChecklist.currentLane,
        targetLane: pendingChecklist.targetLane,
        checklist: pendingChecklist.checklist,
        isMandatory: pendingChecklist.isMandatory,
        checklistType: pendingChecklist.checklistType,
        ...(pendingChecklist.statusAlreadyApplied
          ? { statusAlreadyApplied: true }
          : { statusWillBeAppliedByParent: true }),
      };

      setTimeout(() => {
        setOpenRemarksFor(JSON.stringify(validationInfo));
      }, 0);
    } else {
      // No pending checklist: complete the move for this candidate, then open next bulk candidate's first checklist if any
      // For bulk mandatory flows, apply status once via bulkUpdateCandidates before completing moves.
      const bulkIds = bulkMandatoryCandidateIdsRef.current;
      if (bulkIds && !bulkMandatoryStatusAppliedRef.current) {
        const candidateIds = Array.from(bulkIds);
        const firstPending = pendingMoves.find((pm) =>
          bulkIds.has(pm.candidateId),
        );
        const targetStatus = firstPending?.targetLaneId;
        if (targetStatus) {
          bulkUpdateCandidates({
            operation: 'statusUpdate',
            candidateIds,
            status: targetStatus,
          })
            .unwrap()
            .then(() => {
              bulkMandatoryStatusAppliedRef.current = true;
            });
        }
      }

      completePendingMove(candidateId).then(() => {
        setBulkChecklistQueue((prev) => {
          const [next, ...rest] = prev;
          if (!next) return prev;
          if (rest.length === 0) {
            bulkMandatoryCandidateIdsRef.current = null;
            bulkMandatoryStatusAppliedRef.current = false;
          }
          setOpenRemarksFor(next.validationInfo);
          if (next.pendingValidationInfo) {
            try {
              const p = JSON.parse(next.pendingValidationInfo) as {
                currentLane?: string;
                targetLane?: string;
                checklist?: unknown;
                isMandatory?: boolean;
                checklistType?: 'incoming' | 'outgoing';
              };
              setPendingChecklists((prevP) => [
                ...prevP,
                {
                  candidateId: next.candidateId,
                  currentLane: p.currentLane ?? next.sourceLaneId,
                  targetLane: p.targetLane ?? next.targetLaneId,
                  checklist: p.checklist ?? null,
                  isMandatory: p.isMandatory ?? true,
                  checklistType: p.checklistType ?? 'incoming',
                },
              ]);
            } catch {
              // ignore invalid JSON
            }
          }
          return rest;
        });
      });
    }
  };

  /**
   * Bulk-drag two-phase: one submit for all candidates (outgoing then incoming).
   * Called by the checklist dialog when bulkDragTwoPhase is set.
   * Returns { transitionedToIncoming: true } when the incoming dialog was set so the dialog won't close/clear.
   */
  const onBulkDragTwoPhaseSubmit = useCallback(
    async (
      data: ChecklistSubmissionData,
    ): Promise<{ transitionedToIncoming?: boolean } | void> => {
      const state = bulkDragTwoPhase;
      if (!state || !job?._id) return undefined;
      const { phase, candidateIds, sourceLaneId, targetLaneId } = state;
      let resolvedStatus = targetLaneId;
      if (!state.statusAlreadyApplied && phase === 'outgoing') {
        resolvedStatus = sourceLaneId;
      }
      const candidates = candidateIds.map((id) => ({
        candidateId: id,
        newStatus: resolvedStatus,
      }));
      try {
        await bulkSubmitChecklist({ data, candidates }).unwrap();

        if (state.statusAlreadyApplied) {
          // Optional-first path: status is already moved. If incoming checklist exists,
          // transition to incoming instead of ending after outgoing.
          if (phase === 'outgoing') {
            const incomingInfo = bulkDragIncomingValidationInfoRef.current;
            if (incomingInfo) {
              setBulkDragTwoPhase((prev) =>
                prev ? { ...prev, phase: 'incoming' } : null,
              );
              setOpenRemarksFor(incomingInfo);
              return { transitionedToIncoming: true };
            }
          }
          setBulkDragTwoPhase(null);
          bulkDragIncomingValidationInfoRef.current = null;
          bulkDragIncomingIsMandatoryRef.current = false;
          bulkMandatoryCandidateIdsRef.current = null;
          await refetch();
          dispatch(clearSelectedCandidates());
          return undefined;
        }

        if (phase === 'outgoing') {
          const incomingInfo = bulkDragIncomingValidationInfoRef.current;
          if (incomingInfo) {
            const incomingIsMandatory = bulkDragIncomingIsMandatoryRef.current;
            if (incomingIsMandatory) {
              // Hold status update; show incoming checklist first, then update after they submit
              setBulkDragTwoPhase((prev) =>
                prev ? { ...prev, phase: 'incoming' } : null,
              );
              setOpenRemarksFor(incomingInfo);
              return { transitionedToIncoming: true };
            }
            // Incoming is optional: update status now, then show incoming checklist for optional fill
            await bulkUpdateCandidates({
              operation: 'statusUpdate',
              candidateIds,
              status: targetLaneId,
            }).unwrap();
            setBulkDragTwoPhase((prev) =>
              prev ? { ...prev, phase: 'incoming' } : null,
            );
            setOpenRemarksFor(incomingInfo);
            return { transitionedToIncoming: true };
          }
          // First candidate had only one checklist; complete the move now.
          // Backend was told newStatus: sourceLaneId for the checklist submit; update status to target now.
          await bulkUpdateCandidates({
            operation: 'statusUpdate',
            candidateIds,
            status: targetLaneId,
          }).unwrap();
          const sourceCol = columns.find((c) => c.id === sourceLaneId);
          const targetCol = columns.find((c) => c.id === targetLaneId);
          const idsSet = new Set(candidateIds);
          if (sourceCol && targetCol) {
            const movedCandidates = sourceCol.candidates.filter((c) =>
              idsSet.has(c._id),
            );
            const firstMove = pendingMoves.find((pm) =>
              idsSet.has(pm.candidateId),
            );
            const targetIndex =
              firstMove?.targetIndex ?? targetCol.candidates.length;
            const newColumns = columns.map((col) => {
              if (col.id === sourceLaneId)
                return {
                  ...col,
                  candidates: col.candidates.filter((c) => !idsSet.has(c._id)),
                };
              if (col.id === targetLaneId)
                return {
                  ...col,
                  candidates: [
                    ...targetCol.candidates.slice(0, targetIndex),
                    ...movedCandidates,
                    ...targetCol.candidates.slice(targetIndex),
                  ],
                };
              return col;
            });
            setColumns(newColumns);
          }
          setPendingMoves((prev) =>
            prev.filter((pm) => !idsSet.has(pm.candidateId)),
          );
          setBulkDragTwoPhase(null);
          bulkDragIncomingValidationInfoRef.current = null;
          bulkDragIncomingIsMandatoryRef.current = false;
          bulkMandatoryCandidateIdsRef.current = null;
          await refetch();
          dispatch(clearSelectedCandidates());
        } else {
          const sourceCol = columns.find((c) => c.id === sourceLaneId);
          const targetCol = columns.find((c) => c.id === targetLaneId);
          const idsSet = new Set(candidateIds);
          if (sourceCol && targetCol) {
            const movedCandidates = sourceCol.candidates.filter((c) =>
              idsSet.has(c._id),
            );
            const firstMove = pendingMoves.find((pm) =>
              idsSet.has(pm.candidateId),
            );
            const targetIndex =
              firstMove?.targetIndex ?? targetCol.candidates.length;
            const newColumns = columns.map((col) => {
              if (col.id === sourceLaneId)
                return {
                  ...col,
                  candidates: col.candidates.filter((c) => !idsSet.has(c._id)),
                };
              if (col.id === targetLaneId)
                return {
                  ...col,
                  candidates: [
                    ...col.candidates.slice(0, targetIndex),
                    ...movedCandidates,
                    ...col.candidates.slice(targetIndex),
                  ],
                };
              return col;
            });
            setColumns(newColumns);
          }
          setPendingMoves((prev) =>
            prev.filter((pm) => !idsSet.has(pm.candidateId)),
          );
          setBulkDragTwoPhase(null);
          bulkDragIncomingValidationInfoRef.current = null;
          bulkDragIncomingIsMandatoryRef.current = false;
          bulkMandatoryCandidateIdsRef.current = null;
          await refetch();
          dispatch(clearSelectedCandidates());
        }
        return undefined;
      } catch (err) {
        toast({
          title: 'Error',
          description:
            (err as { data?: { error?: string } })?.data?.error ??
            (err as Error)?.message ??
            'Failed to apply checklist',
          variant: 'destructive',
        });
        return undefined;
      }
    },
    [
      bulkDragTwoPhase,
      bulkSubmitChecklist,
      bulkUpdateCandidates,
      columns,
      pendingMoves,
      setColumns,
      setOpenRemarksFor,
      refetch,
      job,
      toast,
      dispatch,
    ],
  );

  const updateLanesOrder = async (newColumns: CandidateColumn[]): Promise<boolean> => {
    const lansArray = newColumns.map((column) => column.id);
    try {
      await updateLanes({
        jobId: typeof job?._id === 'string' ? job?._id : String(job?._id),
        lanes: lansArray,
        useCustomLanes: true,
      }).unwrap();
      return true;
    } catch (error: unknown) {
      const err = error as {
        status?: number;
        data?: { error?: string; message?: string };
        error?: string;
      };
      const message =
        err?.data?.error ??
        err?.data?.message ??
        err?.error ??
        (error instanceof Error ? error.message : undefined) ??
        'Failed to update lane order';

      // Most common cause here: interviewer/readonly roles hitting admin/hr-only endpoint.
      toast({
        title: 'Lane order not saved',
        description:
          err?.status === 401 || err?.status === 403
            ? 'You do not have permission to reorder lanes for this job.'
            : message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, type, draggableId } = result;
    const bulkPayload = bulkDragRef.current;
    bulkDragRef.current = null;
    setBulkDragState({ isBulkDrag: false, draggedId: null, bulkIds: [] });

    if (!destination) {
      return;
    }

    if (type === 'lane') {
      document.body.classList.add('dnd-updating');
      // ENGAGE THE LOCK FOR LANE REORDERING
      DndSyncLock.lock(2500);
      try {
        const prevColumns = columns;
        const newColumns = [...columns];
        const [removed] = newColumns.splice(source.index, 1);
        newColumns.splice(destination.index, 0, removed);
        setColumns(newColumns);
        const ok = await updateLanesOrder(newColumns);
        if (!ok) {
          // Revert local reorder if backend didn't persist (prevents "works until refresh")
          setColumns(prevColumns);
          DndSyncLock.unlock();
        }
      } catch {
        // Unlock immediately on error so it snaps back
        DndSyncLock.unlock();
      } finally {
        setTimeout(() => {
          document.body.classList.remove('dnd-updating');
        }, 100);
      }
      return;
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find(
      (col) => col.id === destination.droppableId,
    );

    if (!sourceColumn || !destColumn) return;

    if (bulkPayload && bulkPayload.bulkIds.length > 1) {
      // Same-lane drop in multi-select: do not trigger status update or checklists
      if (source.droppableId === destination.droppableId) {
        return;
      }
      const idsToMove = bulkPayload.bulkIds;
      type CandidateWithSource = { candidate: Candidate; sourceLaneId: string };

      const idToCandidate = new Map(selectedCandidates.map((c) => [c._id, c]));
      const candidatesWithSource: CandidateWithSource[] = [];
      for (const id of idsToMove) {
        const c = idToCandidate.get(id);
        if (c) {
          candidatesWithSource.push({
            candidate: c,
            sourceLaneId: c.status,
          });
        }
      }

      const validationResults = candidatesWithSource.map(
        ({ candidate, sourceLaneId }) => {
          const raw = validateCompleteMovement(
            candidate,
            sourceLaneId,
            destination.droppableId,
          );
          const outgoingOnly = validateMovement(
            candidate,
            sourceLaneId,
            destination.droppableId,
            'outgoing',
          );
          const sourceMandatoryOutgoing =
            outgoingOnly.requiresChecklist && outgoingOnly.isMandatory;
          if (sourceMandatoryOutgoing && !raw.validation.requiresChecklist) {
            return {
              candidate,
              sourceLaneId,
              validationResult: {
                validation: outgoingOnly,
                type: 'outgoing' as const,
              },
            };
          }
          return { candidate, sourceLaneId, validationResult: raw };
        },
      );

      const firstMandatory = validationResults.find(
        (v) =>
          v.validationResult.validation.requiresChecklist &&
          v.validationResult.validation.isMandatory,
      );

      if (firstMandatory) {
        // Mandatory checklist: one dialog for all selected candidates; submit applies to all via onBulkDragTwoPhaseSubmit.
        const { validationResult } = firstMandatory;
        const val = validationResult.validation;
        const checklistType = validationResult.type ?? 'outgoing';
        const validationInfo = JSON.stringify({
          candidateId: firstMandatory.candidate._id,
          currentLane: firstMandatory.sourceLaneId,
          targetLane: destination.droppableId,
          checklist: 'checklist' in val ? val.checklist : null,
          isMandatory: val.isMandatory,
          checklistType,
        });

        bulkMandatoryCandidateIdsRef.current = new Set(idsToMove);
        setBulkDragTwoPhase({
          phase: 'outgoing',
          candidateIds: idsToMove,
          sourceLaneId: source.droppableId,
          targetLaneId: destination.droppableId,
        });

        if (
          'pendingValidation' in validationResult &&
          validationResult.pendingValidation?.requiresChecklist &&
          'pendingType' in validationResult &&
          validationResult.pendingType
        ) {
          const p = validationResult.pendingValidation;
          bulkDragIncomingValidationInfoRef.current = JSON.stringify({
            candidateId: firstMandatory.candidate._id,
            currentLane: firstMandatory.sourceLaneId,
            targetLane: destination.droppableId,
            checklist: 'checklist' in p ? p.checklist : null,
            isMandatory: p.isMandatory,
            checklistType: validationResult.pendingType,
          });
          bulkDragIncomingIsMandatoryRef.current = p.isMandatory ?? true;
        } else {
          bulkDragIncomingValidationInfoRef.current = null;
          bulkDragIncomingIsMandatoryRef.current = false;
        }

        setPendingMoves(
          candidatesWithSource.map(({ candidate }, i) => ({
            candidateId: candidate._id,
            sourceLaneId: candidate.status,
            targetLaneId: destination.droppableId as CandidateStatus,
            sourceIndex:
              sourceColumn.candidates.findIndex((c) => c._id === candidate._id) ??
              0,
            targetIndex: destination.index + i,
          })),
        );

        setOpenRemarksFor(validationInfo);
        return;
      }

      // BULK OPTIMISTIC UPDATE: remove moved candidates from source; mark source column so KanbanColumn can remove them from local state (avoids duplicates when lane has page 2+ loaded).
      const sourceLaneId = source.droppableId;
      const newColumnsBulk = columns.map((col) => {
        const candidates = col.candidates.filter((c) => !idsToMove.includes(c._id));
        const isSourceColumn = col.id === sourceLaneId;
        return {
          ...col,
          candidates,
          removedFromLaneIds: isSourceColumn ? idsToMove : col.removedFromLaneIds,
        };
      });
      const destColBulk = newColumnsBulk.find((col) => col.id === destination.droppableId);
      if (!destColBulk) return;

      const newDestCandidatesBulk = [...destColBulk.candidates];
      newDestCandidatesBulk.splice(
        destination.index,
        0,
        ...candidatesWithSource.map(({ candidate }) => ({
          ...candidate,
          status: destination.droppableId as CandidateStatus,
        })),
      );
      const destColIndexBulk = newColumnsBulk.findIndex(
        (col) => col.id === destination.droppableId,
      );
      newColumnsBulk[destColIndexBulk] = {
        ...destColBulk,
        candidates: newDestCandidatesBulk,
      };

      setColumns(newColumnsBulk);

      const optionalChecklistCandidates = validationResults.filter(
        ({ candidate: c, validationResult: valResult }) =>
          c.status !== destination.droppableId &&
          valResult.validation.requiresChecklist &&
          !valResult.validation.isMandatory,
      );

      try {
        document.body.classList.add('dnd-updating');
        // ENGAGE THE LOCK FOR BULK MOVE
        DndSyncLock.lock(2500);

        const idsNeedingUpdate = candidatesWithSource
          .filter(
            ({ candidate }) => candidate.status !== destination.droppableId,
          )
          .map(({ candidate }) => candidate._id);

        if (idsNeedingUpdate.length > 0) {
          await bulkUpdateCandidates({
            operation: 'statusUpdate',
            candidateIds: idsNeedingUpdate,
            status: destination.droppableId,
          }).unwrap();
        }

        // When prompt-for-reason is enabled and we bulk-moved multiple candidates with no
        // checklist dialog opened in this flow, open the bulk reason dialog for them.
        if (
          idsNeedingUpdate.length > 1 &&
          job?.promptForStatusChangeReason &&
          optionalChecklistCandidates.length === 0
        ) {
          // However, candidate.checklistData can be stale/missing for some paginated
          // items (especially at the lane end). Validate again using config-only rules
          // so we don't incorrectly fall back to the reason dialog.
          const configOnlyValidationResults = candidatesWithSource.map(
            ({ candidate, sourceLaneId }) => {
              const raw = validateCompleteMovementConfigOnly(
                candidate,
                sourceLaneId,
                destination.droppableId,
              );
              return {
                candidate,
                sourceLaneId,
                validationResult: raw,
              };
            },
          );

          const firstConfigChecklist = configOnlyValidationResults.find(
            ({ validationResult }) =>
              validationResult.validation.requiresChecklist === true,
          );

          if (firstConfigChecklist) {
            const { candidate: firstCandidate, sourceLaneId } =
              firstConfigChecklist;
            const valResult = firstConfigChecklist.validationResult;
            const primary = valResult.validation;
            const primaryType = valResult.type ?? 'outgoing';
            const checklistType = primaryType;

            const validationInfo = JSON.stringify({
              candidateId: firstCandidate._id,
              currentLane: sourceLaneId,
              targetLane: destination.droppableId,
              checklist: 'checklist' in primary ? primary.checklist : null,
              isMandatory: primary.isMandatory,
              checklistType,
              statusAlreadyApplied: true,
            });

            // If there is also a pending (incoming) checklist, store it so
            // onBulkDragTwoPhaseSubmit can transition.
            if (
              'pendingValidation' in valResult &&
              valResult.pendingValidation?.requiresChecklist &&
              'pendingType' in valResult &&
              valResult.pendingType
            ) {
              const p = valResult.pendingValidation;
              bulkDragIncomingValidationInfoRef.current = JSON.stringify({
                candidateId: firstCandidate._id,
                currentLane: sourceLaneId,
                targetLane: destination.droppableId,
                checklist: 'checklist' in p ? p.checklist : null,
                isMandatory: p.isMandatory,
                checklistType: valResult.pendingType,
                statusAlreadyApplied: true,
              });
              bulkDragIncomingIsMandatoryRef.current = p.isMandatory ?? false;
            } else {
              bulkDragIncomingValidationInfoRef.current = null;
              bulkDragIncomingIsMandatoryRef.current = false;
            }

            setBulkDragTwoPhase({
              phase: primaryType === 'incoming' ? 'incoming' : 'outgoing',
              candidateIds: idsNeedingUpdate,
              sourceLaneId: source.droppableId,
              targetLaneId: destination.droppableId,
              statusAlreadyApplied: true,
            });

            setOpenRemarksFor(validationInfo);
          } else {
            const payload = stringifyBulkReasonPayload({
              candidateIds: idsNeedingUpdate,
              newStatus: destination.droppableId,
              statusAlreadyApplied: true,
              sourceLaneId: source.droppableId,
            });
            setOpenRemarksFor(payload);
          }
        }

        // Optional checklist(s): status already applied above; open ONE bulk checklist dialog whose submit applies to all selected candidates.
        if (optionalChecklistCandidates.length > 0) {
          const first = optionalChecklistCandidates[0];
          const valResult = first.validationResult;
          const val = valResult.validation;
          const checklistType = valResult.type ?? 'outgoing';
          const validationInfo = JSON.stringify({
            candidateId: first.candidate._id,
            currentLane: first.sourceLaneId,
            targetLane: destination.droppableId,
            checklist: 'checklist' in val ? val.checklist : null,
            isMandatory: false,
            checklistType,
            statusAlreadyApplied: true,
          });

          // Use the bulk two-phase submit path so checklist submission fans out to all ids in one API call.
          setBulkDragTwoPhase({
            phase: 'outgoing',
            candidateIds: idsNeedingUpdate,
            sourceLaneId: source.droppableId,
            targetLaneId: destination.droppableId,
            statusAlreadyApplied: true,
          });

          // If there is also a pending (incoming) checklist, store it so onBulkDragTwoPhaseSubmit can transition.
          if (
            'pendingValidation' in valResult &&
            valResult.pendingValidation?.requiresChecklist &&
            'pendingType' in valResult &&
            valResult.pendingType
          ) {
            const p = valResult.pendingValidation;
            bulkDragIncomingValidationInfoRef.current = JSON.stringify({
              candidateId: first.candidate._id,
              currentLane: first.sourceLaneId,
              targetLane: destination.droppableId,
              checklist: 'checklist' in p ? p.checklist : null,
              isMandatory: p.isMandatory,
              checklistType: valResult.pendingType,
              statusAlreadyApplied: true,
            });
            bulkDragIncomingIsMandatoryRef.current = p.isMandatory ?? false;
          } else {
            bulkDragIncomingValidationInfoRef.current = null;
            bulkDragIncomingIsMandatoryRef.current = false;
          }

          setOpenRemarksFor(validationInfo);
        }
      } catch {
        DndSyncLock.unlock(); // Revert lock on error
        setColumns([...columns]);
        toast({
          title: 'Error',
          description: 'Failed to move some candidates',
          variant: 'destructive',
        });
      } finally {
        setTimeout(() => {
          document.body.classList.remove('dnd-updating');
        }, 100);
      }
      await refetch();
      dispatch(clearSelectedCandidates());
      return;
    }

    // SINGLE CANDIDATE MOVE
    const newColumns = [...columns];
    const sourceColumnIndex = columns.findIndex(
      (col) => col.id === source.droppableId,
    );
    const destColumnIndex = columns.findIndex(
      (col) => col.id === destination.droppableId,
    );
    if (sourceColumnIndex === destColumnIndex) return;

    // Before performing optimistic move, run client-side checklist validation.
    // If movement requires a checklist, open the checklist dialog and queue the move instead of
    // immediately updating status. This preserves the drag flicker fix while restoring checklist gating.
    try {
      const draggedCandidate =
        sourceColumn.candidates.find((c) => c._id === draggableId) ??
        resolveCandidateForDrag?.(draggableId);

      if (draggedCandidate && source.droppableId !== destination.droppableId) {
        const validationResult = validateCompleteMovement(
          draggedCandidate,
          source.droppableId,
          destination.droppableId,
        );

        const needsChecklist =
          validationResult &&
          validationResult.validation &&
          validationResult.validation.requiresChecklist;

        if (needsChecklist) {
          const primary = validationResult.validation;
          const primaryType = validationResult.type;

          // Safety guard: we only support outgoing/incoming checklist types here.
          if (
            primary &&
            (primaryType === 'outgoing' || primaryType === 'incoming')
          ) {
            const basePayload = {
              candidateId: draggedCandidate._id,
              currentLane: source.droppableId,
              targetLane: destination.droppableId,
              checklist:
                'checklist' in primary ? (primary.checklist ?? null) : null,
              isMandatory: primary.isMandatory,
              checklistType: primaryType,
            } as {
              candidateId: string;
              currentLane: string;
              targetLane: string;
              checklist: unknown;
              isMandatory: boolean;
              checklistType: 'incoming' | 'outgoing';
            };

            // Non-mandatory: update candidate first, then open checklist (optional fill).
            if (!primary.isMandatory) {
              const payloadWithFlag = {
                ...basePayload,
                statusAlreadyApplied: true,
              };
              if (
                'pendingValidation' in validationResult &&
                validationResult.pendingValidation &&
                'pendingType' in validationResult &&
                validationResult.pendingType
              ) {
                const pending = validationResult.pendingValidation;
                const { pendingType } = validationResult;
                setPendingChecklists((prev) => [
                  ...prev,
                  {
                    candidateId: draggedCandidate._id,
                    currentLane: source.droppableId,
                    targetLane: destination.droppableId,
                    checklist:
                      'checklist' in pending
                        ? (pending.checklist ?? null)
                        : null,
                    isMandatory: pending.isMandatory,
                    checklistType: pendingType,
                    statusAlreadyApplied: true,
                  },
                ]);
              }
              const newCols = [...columns];
              const srcCol = newCols[sourceColumnIndex];
              const dstCol = newCols[destColumnIndex];
              const newSourceCands = [...srcCol.candidates];
              const moveIdx = newSourceCands.findIndex(
                (c) => c._id === draggableId,
              );
              const [removed] = newSourceCands.splice(moveIdx, 1);
              const newDestCands = [...dstCol.candidates];
              newDestCands.splice(destination.index, 0, {
                ...removed!,
                status: destination.droppableId,
              });
              newCols[sourceColumnIndex] = {
                ...srcCol,
                candidates: newSourceCands,
              };
              newCols[destColumnIndex] = {
                ...dstCol,
                candidates: newDestCands,
              };
              setColumns(newCols);
              try {
                document.body.classList.add('dnd-updating');
                DndSyncLock.lock(2500);
                const updated = await updateCandidate({
                  _id: draggableId,
                  status: destination.droppableId,
                }).unwrap();
                sentStatusMailHandler(
                  { ...updated, prev_status: source.droppableId },
                  sendStatusMail,
                  { remark: '' },
                );
                setOpenRemarksFor(JSON.stringify(payloadWithFlag));
              } catch {
                DndSyncLock.unlock();
                setColumns([...columns]);
                toast({
                  title: 'Error',
                  description: 'Failed to update candidate status',
                  variant: 'destructive',
                });
              } finally {
                setTimeout(() => {
                  document.body.classList.remove('dnd-updating');
                }, 100);
              }
              return;
            }

            // Mandatory: queue the move and open checklist first; status applied after submit.
            if (
              'pendingValidation' in validationResult &&
              validationResult.pendingValidation &&
              'pendingType' in validationResult &&
              validationResult.pendingType
            ) {
              const pending = validationResult.pendingValidation;
              const { pendingType } = validationResult;
              setPendingChecklists((prev) => [
                ...prev,
                {
                  candidateId: draggedCandidate._id,
                  currentLane: source.droppableId,
                  targetLane: destination.droppableId,
                  checklist:
                    'checklist' in pending ? (pending.checklist ?? null) : null,
                  isMandatory: pending.isMandatory,
                  checklistType: pendingType,
                },
              ]);
            }
            setPendingMoves((prev) => [
              ...prev,
              {
                candidateId: draggedCandidate._id,
                sourceLaneId: source.droppableId,
                targetLaneId: destination.droppableId as CandidateStatus,
                sourceIndex: source.index,
                targetIndex: destination.index,
              },
            ]);
            setOpenRemarksFor(JSON.stringify(basePayload));
            return;
          }
        }
      }
    } catch (e) {
      logger.error('[useCandidate] checklist validation during drag failed', {
        error: e,
        candidateId: draggableId,
        sourceLane: source.droppableId,
        targetLane: destination.droppableId,
      });
    }

    const newSourceCandidates = [...sourceColumn.candidates];
    const newDestCandidates =
      source.droppableId === destination.droppableId
        ? newSourceCandidates
        : [...destColumn.candidates];

    const sourceIndex = newSourceCandidates.findIndex(
      (c) => c._id === draggableId,
    );
    let removed: Candidate | undefined;

    if (sourceIndex !== -1) {
      [removed] = newSourceCandidates.splice(sourceIndex, 1);
    } else {
      removed =
        resolveCandidateForDrag?.(draggableId) ??
        ({ _id: draggableId, status: source.droppableId } as Candidate);
    }

    const hasCursorPageSnapshot = isDragCandidateSnapshot(removed);
    const shouldUpdatePageLevelState =
      sourceIndex !== -1 || hasCursorPageSnapshot;

    if (shouldUpdatePageLevelState) {
      if (source.droppableId !== destination.droppableId) {
        newDestCandidates.splice(destination.index, 0, {
          ...removed!,
          status: destination.droppableId,
        });
      } else {
        newDestCandidates.splice(destination.index, 0, removed!);
      }
      if (sourceIndex !== -1) {
        newColumns[sourceColumnIndex] = {
          ...sourceColumn,
          candidates: newSourceCandidates,
          removedFromLaneIds:
            source.droppableId !== destination.droppableId
              ? [...(sourceColumn.removedFromLaneIds ?? []), draggableId]
              : sourceColumn.removedFromLaneIds,
        };
      } else {
        newColumns[sourceColumnIndex] = {
          ...sourceColumn,
          removedFromLaneIds: [
            ...(sourceColumn.removedFromLaneIds ?? []),
            draggableId,
          ],
        };
      }
      if (sourceColumnIndex !== destColumnIndex) {
        newColumns[destColumnIndex] = {
          ...destColumn,
          candidates: newDestCandidates,
        };
      }
    } else if (source.droppableId !== destination.droppableId) {
      // Page-level slice for this lane doesn't contain the candidate (e.g. it was on page 2+),
      // but we still need lane UIs (offset/cursor) to drop this id from their local state.
      const columnsWithRemovedFlag = columns.map((col) =>
        col.id === source.droppableId
          ? {
              ...col,
              removedFromLaneIds: [
                ...(col.removedFromLaneIds ?? []),
                draggableId,
              ],
            }
          : col,
      );
      setColumns(columnsWithRemovedFlag);
    }

    if (source.droppableId !== destination.droppableId) {
      const targetStatus = String(destination.droppableId).toLowerCase();
      const moveSnapshot =
        removed != null
          ? ({ ...removed, status: destination.droppableId } as Candidate)
          : undefined;

      onPendingStatusMove?.(draggableId, targetStatus, moveSnapshot);

      const optionalChecklistValidationInfo: string | null = null;

      try {
        document.body.classList.add('dnd-updating');

        // ... (Keep your single candidate validation logic unchanged here) ...

        // SINGLE OPTIMISTIC UPDATE
        if (shouldUpdatePageLevelState) {
          setColumns(newColumns);
        }

        if (job?.promptForStatusChangeReason) {
          setOpenRemarksFor(draggableId);
        }

        // ENGAGE THE LOCK FOR SINGLE CANDIDATE API CALL
        DndSyncLock.lock(2500);

        const updatedCandidate = await updateCandidate({
          _id: draggableId,
          status: destination.droppableId,
        }).unwrap();

        onPendingStatusMove?.(draggableId, targetStatus, updatedCandidate);

        if (filtersActive) {
          void refetch();
        }

        sentStatusMailHandler(
          { ...updatedCandidate, prev_status: source.droppableId },
          sendStatusMail,
          { remark: '' },
        );

        if (optionalChecklistValidationInfo) {
          setOpenRemarksFor(optionalChecklistValidationInfo);
        }
      } catch {
        DndSyncLock.unlock(); // Revert lock on error
        onPendingStatusMove?.(
          draggableId,
          String(source.droppableId).toLowerCase(),
          hasCursorPageSnapshot ? removed : undefined,
        );
        if (shouldUpdatePageLevelState) {
          setColumns([...columns]);
        }
        toast({
          title: 'Error',
          description: 'Failed to validate or update candidate status',
          variant: 'destructive',
        });
      } finally {
        setTimeout(() => {
          document.body.classList.remove('dnd-updating');
        }, 100);
      }

      if (!optionalChecklistValidationInfo && !job?.promptForStatusChangeReason) {
        dispatch(clearSelectedCandidates());
      }
      // Single-candidate drag with prompt-for-reason: open bulk reason dialog for that one candidate.
      // if (
      //   !optionalChecklistValidationInfo &&
      //   job?.promptForStatusChangeReason
      // ) {
      //   const payload = stringifyBulkReasonPayload({
      //     candidateIds: [draggableId],
      //     newStatus: destination.droppableId,
      //     statusAlreadyApplied: true,
      //     sourceLaneId: source.droppableId,
      //   });
      //   setOpenRemarksFor(payload);
      // }
    } else {
      setColumns(newColumns);
    }
  };

  // const handleCandidateUpdate = (updatedCandidate: Candidate) => {
  //   if (selectedCandidate?._id === updatedCandidate._id) {
  //     setSelectedCandidate({
  //       ...selectedCandidate,
  //       ...updatedCandidate,
  //       duplicateCount:
  //         updatedCandidate.duplicateCount ||
  //         selectedCandidate.duplicateCount ||
  //         0,
  //     });
  //   }

  //   setColumns((prevColumns) => {
  //     const hasTargetLane = prevColumns.some(
  //       (column) => column.id === updatedCandidate.status,
  //     );
  //     const candidateExists = prevColumns.some((column) =>
  //       column.candidates.some(
  //         (candidate) => candidate._id === updatedCandidate._id,
  //       ),
  //     );

  //     if (!hasTargetLane || !candidateExists) {
  //       return prevColumns;
  //     }

  //     return prevColumns.map((column) => {
  //       const isTarget = column.id === updatedCandidate.status;

  //       // Find existing candidate anywhere in columns to get its full data
  //       let existingCandidate: Candidate | undefined;
  //       for (const col of prevColumns) {
  //         existingCandidate = col.candidates.find(
  //           (c) => c._id === updatedCandidate._id,
  //         );
  //         if (existingCandidate) break;
  //       }

  //       if (isTarget) {
  //         const merged = existingCandidate
  //           ? {
  //               ...existingCandidate,
  //               ...updatedCandidate,
  //               duplicateCount:
  //                 updatedCandidate.duplicateCount ||
  //                 existingCandidate.duplicateCount ||
  //                 0,
  //             }
  //           : updatedCandidate;

  //         return {
  //           ...column,
  //           candidates: [
  //             merged,
  //             ...column.candidates.filter(
  //               (candidate) => candidate._id !== updatedCandidate._id,
  //             ),
  //           ],
  //         };
  //       }
  //       return {
  //         ...column,
  //         candidates: column.candidates.filter(
  //           (candidate) => candidate._id !== updatedCandidate._id,
  //         ),
  //       };
  //     });
  //   });
  // };

  const handleFileDrop = async (file: File) => {
    setIsDialogOpen(true);
    if (file.type === 'application/pdf') {
      setDroppedFileData(file);
    }
  };

  const handleDeleteClick = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!candidateToDelete) return;

    const targetCandidate =
      columns.flatMap((col) => col.candidates).find((c) => c._id === candidateToDelete) ??
      (selectedCandidate?._id === candidateToDelete ? selectedCandidate : null);

    if (!targetCandidate) return;

    const wasArchived = !!targetCandidate.isDeleted;

    try {
      await deleteCandidate(candidateToDelete).unwrap();
      await refetch();

      const laneId = getCandidateStatusLabel(targetCandidate).toLowerCase();
      const updatedCandidate: Candidate = {
        ...targetCandidate,
        isDeleted: !wasArchived,
      };

      if (onLaneRefetchCurrentPage) {
        onLaneRefetchCurrentPage(
          laneId,
          candidateToDelete,
          updatedCandidate,
        );
      } else if (onLaneRefetch) {
        onLaneRefetch(laneId, candidateToDelete, updatedCandidate);
      }

      if (selectedCandidate?._id === candidateToDelete) {
        setSelectedCandidate(null);
      }

      toast({
        title: 'Success',
        description: `Candidate ${wasArchived ? 'unarchived' : 'archived'} successfully`,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update candidate status',
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeleteDialogOpen(false);
      setCandidateToDelete(null);
    }
  };

  return {
    updateLanesOrder,
    onDragEnd,
    onBeforeDragStart,
    bulkDragState,
    handleFileDrop,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
    handleChecklistComplete,
    pendingChecklists,
    bulkDragTwoPhase,
    onBulkDragTwoPhaseSubmit,
  };
};
