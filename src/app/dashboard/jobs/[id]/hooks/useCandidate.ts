/* eslint-disable max-lines */

import { DropResult, type DragStart } from '@hello-pangea/dnd';
import { toast } from '@/hooks/use-toast';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import { useState, useRef, useCallback } from 'react';
import {
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useBulkUpdateCandidatesMutation,
} from '@/lib/features/candidate/candidateApi';
import { useBulkSubmitChecklistMutation } from '@/lib/features/checklist/checklistApi';
import { useUpdateLanesMutation } from '@/lib/features/lane/laneApi';
import { useSendStatusMailMutation } from '@/lib/features/org/orgApi';
import { sentStatusMailHandler } from '@/lib/utils';
import { Job } from '@/types/job';
import type { ChecklistSubmissionData } from '@/types/checklist';
import logger from '@/lib/logger';
import { IJobLaneConfig } from '@/lib/models/JobLaneConfig';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { clearSelectedCandidates } from '@/lib/redux/selectedCandidatesSlice';
import { useClientSideChecklistValidation } from './useClientSideChecklistValidation';

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
    getMandatoryOutgoingForLane,
  } = useClientSideChecklistValidation(jobLaneConfig, user?.role);

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
      // Update candidate status via bulk-update API (single id)
      await bulkUpdateCandidates({
        operation: 'statusUpdate',
        candidateIds: [candidateId],
        status: pendingMove.targetLaneId,
      }).unwrap();

      // Remove from pending moves
      setPendingMoves((prev) =>
        prev.filter((pm) => pm.candidateId !== candidateId),
      );

      // Refetch to ensure consistency
      await refetch();
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
      setOpenRemarksFor(null);
      dispatch(clearSelectedCandidates());
      return;
    }
    setPendingMoves((prev) =>
      prev.filter((pm) => pm.candidateId !== candidateId),
    );
    setPendingChecklists((prev) =>
      prev.filter((pc) => pc.candidateId !== candidateId),
    );
    setBulkChecklistQueue([]);
  };

  // Handler for when a checklist is successfully completed - show next checklist if queued
  const handleChecklistComplete = (candidateId: string) => {
    if (bulkDragTwoPhase) return;

    // Status was deferred from unified dialog (single or bulk); apply via bulk-update API and clear pending
    if (
      pendingStatusAfterChecklist?.candidateId === candidateId &&
      setPendingStatusAfterChecklist
    ) {
      const { newStatus } = pendingStatusAfterChecklist;
      bulkUpdateCandidates({
        operation: 'statusUpdate',
        candidateIds: [candidateId],
        status: newStatus,
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

    // Bulk optional: status was already applied; just advance the queue
    if (
      bulkStatusQueue?.length &&
      bulkStatusQueue[0].candidateId === candidateId
    ) {
      onBulkQueueStepComplete?.();
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

      // Show the pending checklist dialog (second checklist - no status update yet)
      const validationInfo = {
        candidateId: pendingChecklist.candidateId,
        currentLane: pendingChecklist.currentLane,
        targetLane: pendingChecklist.targetLane,
        checklist: pendingChecklist.checklist,
        isMandatory: pendingChecklist.isMandatory,
        checklistType: pendingChecklist.checklistType,
      };

      setOpenRemarksFor(JSON.stringify(validationInfo));
    } else {
      // No pending checklist: complete the move for this candidate, then open next bulk candidate's first checklist if any
      completePendingMove(candidateId).then(() => {
        setBulkChecklistQueue((prev) => {
          const [next, ...rest] = prev;
          if (!next) return prev;
          if (rest.length === 0) {
            bulkMandatoryCandidateIdsRef.current = null;
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

  const updateLanesOrder = async (newColumns: CandidateColumn[]) => {
    const lansArray = newColumns.map((column) => column.id);
    try {
      await updateLanes({
        userId: user?.id || '',
        lanes: lansArray,
        jobId: job?._id,
      }).unwrap();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
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
      const newColumns = [...columns];
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);
      setColumns(newColumns);
      await updateLanesOrder(newColumns);
      return;
    }

    // Store drag information for potential checklist validation
    const dragInfo = {
      candidateId: draggableId,
      currentLane: source.droppableId,
      targetLane: destination.droppableId,
    };

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
      const candidatesWithSource: CandidateWithSource[] = [];
      for (const id of idsToMove) {
        for (const col of columns) {
          const c = col.candidates.find((cand) => cand._id === id);
          if (c) {
            candidatesWithSource.push({
              candidate: c,
              sourceLaneId: col.id,
            });
            break;
          }
        }
      }

      // Validate each candidate for checklist (outgoing + incoming)
      // Fallback: when target has no checklist, still require source's mandatory outgoing per candidate
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
        const targetLaneId = destination.droppableId;
        const targetIndex = destination.index;
        const sourceIndex = source.index;

        const mandatoryCandidates = validationResults.filter(
          (v) =>
            v.validationResult.validation.requiresChecklist &&
            v.validationResult.validation.isMandatory,
        );

        const hasTwoChecklists = (
          val: (typeof validationResults)[0]['validationResult'],
        ) =>
          'pendingValidation' in val &&
          val.pendingValidation?.requiresChecklist &&
          'pendingType' in val &&
          val.pendingType;

        // When 2+ candidates are clubbed, always use bulk two-phase so we submit in one API call per phase (no per-candidate loop).
        if (mandatoryCandidates.length > 1) {
          mandatoryCandidates.forEach(({ candidate, sourceLaneId }) => {
            setPendingMoves((prev) => [
              ...prev,
              {
                candidateId: candidate._id,
                sourceLaneId,
                targetLaneId: targetLaneId as CandidateStatus,
                sourceIndex,
                targetIndex,
              },
            ]);
          });
          bulkMandatoryCandidateIdsRef.current = new Set(
            mandatoryCandidates.map(({ candidate }) => candidate._id),
          );
          const first = mandatoryCandidates[0];
          const {
            candidate: firstCandidate,
            sourceLaneId,
            validationResult: val,
          } = first;
          const hasIncoming = hasTwoChecklists(val);
          const outgoingValidationInfo: Record<string, unknown> = {
            candidateId: firstCandidate._id,
            currentLane: sourceLaneId,
            targetLane: targetLaneId,
            checklist:
              'checklist' in val.validation ? val.validation.checklist : null,
            isMandatory: val.validation.isMandatory,
            checklistType: val.type,
            ...(hasIncoming ? { hasPendingChecklist: true } : {}),
          };
          const incomingValidationInfo = hasIncoming
            ? {
                candidateId: firstCandidate._id,
                currentLane: sourceLaneId,
                targetLane: targetLaneId,
                checklist:
                  'checklist' in val.pendingValidation!
                    ? val.pendingValidation!.checklist
                    : null,
                isMandatory: val.pendingValidation!.isMandatory,
                checklistType: val.pendingType!,
              }
            : null;
          const incomingIsMandatory =
            hasIncoming &&
            (val.pendingValidation as { isMandatory?: boolean }).isMandatory ===
              true;
          bulkDragIncomingIsMandatoryRef.current = Boolean(incomingIsMandatory);
          bulkDragIncomingValidationInfoRef.current =
            incomingValidationInfo !== null
              ? JSON.stringify(incomingValidationInfo)
              : null;
          setBulkDragTwoPhase({
            phase: 'outgoing',
            candidateIds: mandatoryCandidates.map(
              ({ candidate }) => candidate._id,
            ),
            sourceLaneId: first.sourceLaneId,
            targetLaneId,
          });
          const outgoingInfoToOpen = JSON.stringify(outgoingValidationInfo);
          setTimeout(() => setOpenRemarksFor(outgoingInfoToOpen), 0);
          return;
        }

        mandatoryCandidates.forEach(({ candidate: cand, sourceLaneId }) => {
          setPendingMoves((prev) => [
            ...prev,
            {
              candidateId: cand._id,
              sourceLaneId,
              targetLaneId: targetLaneId as CandidateStatus,
              sourceIndex,
              targetIndex,
            },
          ]);
        });
        bulkMandatoryCandidateIdsRef.current = new Set(
          mandatoryCandidates.map(({ candidate }) => candidate._id),
        );

        const first = mandatoryCandidates[0];
        const { candidate, sourceLaneId, validationResult: val } = first;
        const firstHasPending = hasTwoChecklists(val);
        const validationInfo: Record<string, unknown> = {
          candidateId: candidate._id,
          currentLane: sourceLaneId,
          targetLane: targetLaneId,
          checklist:
            'checklist' in val.validation ? val.validation.checklist : null,
          isMandatory: val.validation.isMandatory,
          checklistType: val.type,
        };
        if (firstHasPending) {
          validationInfo.hasPendingChecklist = true;
          setPendingChecklists((prev) => [
            ...prev,
            {
              candidateId: candidate._id,
              currentLane: sourceLaneId,
              targetLane: targetLaneId,
              checklist:
                'checklist' in val.pendingValidation!
                  ? val.pendingValidation!.checklist
                  : null,
              isMandatory: val.pendingValidation!.isMandatory,
              checklistType: val.pendingType!,
            },
          ]);
        }

        for (let i = 1; i < mandatoryCandidates.length; i += 1) {
          const item = mandatoryCandidates[i];
          const v = item.validationResult;
          const firstValidationInfo: Record<string, unknown> = {
            candidateId: item.candidate._id,
            currentLane: item.sourceLaneId,
            targetLane: targetLaneId,
            checklist:
              'checklist' in v.validation ? v.validation.checklist : null,
            isMandatory: v.validation.isMandatory,
            checklistType: v.type,
          };
          let pendingValidationInfo: string | null = null;
          if (hasTwoChecklists(v)) {
            firstValidationInfo.hasPendingChecklist = true;
            pendingValidationInfo = JSON.stringify({
              candidateId: item.candidate._id,
              currentLane: item.sourceLaneId,
              targetLane: targetLaneId,
              checklist:
                'checklist' in v.pendingValidation!
                  ? v.pendingValidation!.checklist
                  : null,
              isMandatory: v.pendingValidation!.isMandatory,
              checklistType: v.pendingType,
            });
          }
          setBulkChecklistQueue((prev) => [
            ...prev,
            {
              candidateId: item.candidate._id,
              sourceLaneId: item.sourceLaneId,
              targetLaneId,
              validationInfo: JSON.stringify(firstValidationInfo),
              pendingValidationInfo,
              sourceIndex,
              targetIndex,
            },
          ]);
        }

        const firstValidationInfoToOpen = JSON.stringify(validationInfo);
        setTimeout(() => setOpenRemarksFor(firstValidationInfoToOpen), 0);
        return;
      }

      const newColumnsBulk = columns.map((col) => ({
        ...col,
        candidates: col.candidates.filter((c) => !idsToMove.includes(c._id)),
      }));
      const destColBulk = newColumnsBulk.find(
        (col) => col.id === destination.droppableId,
      );
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

      // Collect all candidates needing optional checklists
      const optionalChecklistCandidates = validationResults.filter(
        ({ candidate: c, validationResult: valResult }) =>
          c.status !== destination.droppableId &&
          valResult.validation.requiresChecklist &&
          !valResult.validation.isMandatory,
      );

      try {
        document.body.classList.add('dnd-updating');
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

        if (optionalChecklistCandidates.length > 1) {
          // 2+ candidates: use bulk two-phase with statusAlreadyApplied so we don't re-update status
          const first = optionalChecklistCandidates[0];
          const optionalValidationInfo: Record<string, unknown> = {
            candidateId: first.candidate._id,
            currentLane: first.sourceLaneId,
            targetLane: destination.droppableId,
            checklist:
              'checklist' in first.validationResult.validation
                ? first.validationResult.validation.checklist
                : null,
            isMandatory: false,
            checklistType: first.validationResult.type,
          };
          setBulkDragTwoPhase({
            phase: first.validationResult.type as 'outgoing' | 'incoming',
            candidateIds: optionalChecklistCandidates.map(
              ({ candidate: c }) => c._id,
            ),
            sourceLaneId: first.sourceLaneId,
            targetLaneId: destination.droppableId,
            statusAlreadyApplied: true,
          });
          bulkMandatoryCandidateIdsRef.current = new Set(
            optionalChecklistCandidates.map(({ candidate: c }) => c._id),
          );
          const infoToOpen = JSON.stringify(optionalValidationInfo);
          setTimeout(() => setOpenRemarksFor(infoToOpen), 0);
        } else if (optionalChecklistCandidates.length === 1) {
          const {
            candidate: c,
            sourceLaneId: srcLaneId,
            validationResult: valResult,
          } = optionalChecklistCandidates[0];
          setOpenRemarksFor(
            JSON.stringify({
              candidateId: c._id,
              currentLane: srcLaneId,
              targetLane: destination.droppableId,
              checklist:
                'checklist' in valResult.validation
                  ? valResult.validation.checklist
                  : null,
              isMandatory: false,
              checklistType: valResult.type,
            }),
          );
        } else if (
          job?.promptForStatusChangeReason &&
          candidatesWithSource.length > 0
        ) {
          if (candidatesWithSource.length > 1) {
            setOpenRemarksFor(
              JSON.stringify({
                type: 'bulkReason',
                candidateIds: candidatesWithSource.map(
                  ({ candidate }) => candidate._id,
                ),
                newStatus: destination.droppableId,
                statusAlreadyApplied: true,
                sourceLaneId: source.droppableId,
              }),
            );
          } else {
            setOpenRemarksFor(candidatesWithSource[0].candidate._id);
          }
        }
      } catch {
        setColumns([...columns]);
        toast({
          title: 'Error',
          description: 'Failed to move some candidates',
          variant: 'destructive',
        });
      } finally {
        document.body.classList.remove('dnd-updating');
      }
      await refetch();
      // Clear bulk selection only when no dialog was opened (no optional checklist, no prompt-for-reason)
      if (
        optionalChecklistCandidates.length === 0 &&
        !job?.promptForStatusChangeReason
      ) {
        dispatch(clearSelectedCandidates());
      }
      return;
    }

    const newColumns = [...columns];
    const sourceColumnIndex = columns.findIndex(
      (col) => col.id === source.droppableId,
    );
    const destColumnIndex = columns.findIndex(
      (col) => col.id === destination.droppableId,
    );
    if (sourceColumnIndex === destColumnIndex) {
      return;
    }

    const newSourceCandidates = [...sourceColumn.candidates];
    const newDestCandidates =
      source.droppableId === destination.droppableId
        ? newSourceCandidates
        : [...destColumn.candidates];

    // Find the candidate by ID instead of using the index
    const sourceIndex = newSourceCandidates.findIndex(
      (c) => c._id === draggableId,
    );
    if (sourceIndex === -1) {
      return;
    }

    const [removed] = newSourceCandidates.splice(sourceIndex, 1);

    if (source.droppableId !== destination.droppableId) {
      newDestCandidates.splice(destination.index, 0, {
        ...removed,
        status: destination.droppableId,
      });
    } else {
      newDestCandidates.splice(destination.index, 0, removed);
    }

    newColumns[sourceColumnIndex] = {
      ...sourceColumn,
      candidates: newSourceCandidates,
    };

    if (sourceColumnIndex !== destColumnIndex) {
      newColumns[destColumnIndex] = {
        ...destColumn,
        candidates: newDestCandidates,
      };
    }

    if (source.droppableId !== destination.droppableId) {
      /** When set, optional checklist: open after updateCandidate succeeds */
      let optionalChecklistValidationInfo: string | null = null;

      try {
        // Add a class to prevent flicker during the critical update phase
        document.body.classList.add('dnd-updating');

        // Get the candidate being moved by ID instead of index
        // This ensures we get the correct candidate regardless of sorting
        const candidate = sourceColumn.candidates.find(
          (c) => c._id === draggableId,
        );
        if (!candidate) {
          logger.error('Candidate not found for drag operation');
          document.body.classList.remove('dnd-updating');
          return;
        }

        // Use client-side validation to check if checklist is needed
        const validationResult = validateCompleteMovement(
          candidate,
          source.droppableId,
          destination.droppableId,
        );

        // Fallback: when target has no incoming (or full validation says no checklist), still require source's mandatory outgoing
        const outgoingOnly = validateMovement(
          candidate,
          source.droppableId,
          destination.droppableId,
          'outgoing',
        );
        const sourceRequiresMandatoryOutgoing =
          outgoingOnly.requiresChecklist && outgoingOnly.isMandatory;
        let requiresChecklist =
          validationResult.validation.requiresChecklist ||
          sourceRequiresMandatoryOutgoing;

        // Safety net: if validation said no checklist but config says source lane has mandatory outgoing, force require checklist (e.g. config loaded after memo or lane id mismatch)
        let forceOutgoingValidation: ReturnType<
          typeof validateMovement
        > | null = null;
        if (!requiresChecklist) {
          const fo = getMandatoryOutgoingForLane(source.droppableId);
          if (fo) {
            requiresChecklist = true;
            forceOutgoingValidation = fo;
          }
        }

        // Handle movement based on checklist requirements
        if (requiresChecklist) {
          const validation =
            forceOutgoingValidation ??
            (sourceRequiresMandatoryOutgoing &&
            !validationResult.validation.requiresChecklist
              ? outgoingOnly
              : validationResult.validation);
          let effectiveChecklistType: 'outgoing' | 'incoming' | null;
          if (forceOutgoingValidation) {
            effectiveChecklistType = 'outgoing';
          } else if (
            sourceRequiresMandatoryOutgoing &&
            !validationResult.validation.requiresChecklist
          ) {
            effectiveChecklistType = 'outgoing';
          } else {
            effectiveChecklistType = validationResult.type;
          }
          const hasPending =
            !forceOutgoingValidation &&
            !sourceRequiresMandatoryOutgoing &&
            'pendingValidation' in validationResult &&
            validationResult.pendingValidation?.requiresChecklist &&
            'pendingType' in validationResult &&
            validationResult.pendingType;
          const validationInfo: Record<string, unknown> = {
            ...dragInfo,
            checklist: 'checklist' in validation ? validation.checklist : null,
            isMandatory: validation.isMandatory,
            checklistType: effectiveChecklistType,
          };
          if (hasPending) {
            validationInfo.hasPendingChecklist = true;
          }

          // Queue pending incoming checklist if both outgoing and incoming are required
          if (hasPending) {
            setPendingChecklists((prev) => [
              ...prev,
              {
                candidateId: draggableId,
                currentLane: source.droppableId,
                targetLane: destination.droppableId,
                checklist:
                  'checklist' in validationResult.pendingValidation!
                    ? validationResult.pendingValidation!.checklist
                    : null,
                isMandatory: validationResult.pendingValidation!.isMandatory,
                checklistType: validationResult.pendingType,
              },
            ]);
          }

          if (validation.isMandatory) {
            // For MANDATORY checklists: DON'T move the card or update database
            // Card will only move after successful form submission
            setColumns([...columns]); // Keep original state

            // Add to pending moves to track the intended move
            setPendingMoves((prev) => [
              ...prev,
              {
                candidateId: draggableId,
                sourceLaneId: source.droppableId,
                targetLaneId: destination.droppableId,
                sourceIndex: source.index,
                targetIndex: destination.index,
              },
            ]);

            // Open checklist in next tick so it runs after any column-sync effects (useJobPageEffects) that would overwrite state
            const validationInfoToOpen = JSON.stringify(validationInfo);
            setTimeout(() => setOpenRemarksFor(validationInfoToOpen), 0);
            return; // Exit early, don't update database
          }
          // For OPTIONAL checklists: Move the card optimistically; do NOT open checklist yet.
          // Checklist will open after updateCandidate succeeds below.
          optionalChecklistValidationInfo = JSON.stringify(validationInfo);
          setColumns(newColumns);
        } else {
          // No checklist required by full validation — but source may still have mandatory outgoing (e.g. target has no incoming config)
          const outgoingRecheck = validateMovement(
            candidate,
            source.droppableId,
            destination.droppableId,
            'outgoing',
          );
          if (
            outgoingRecheck.requiresChecklist &&
            outgoingRecheck.isMandatory
          ) {
            setColumns([...columns]);
            setPendingMoves((prev) => [
              ...prev,
              {
                candidateId: draggableId,
                sourceLaneId: source.droppableId,
                targetLaneId: destination.droppableId,
                sourceIndex: source.index,
                targetIndex: destination.index,
              },
            ]);
            const recheckValidationInfo: Record<string, unknown> = {
              ...dragInfo,
              checklist: outgoingRecheck.checklist ?? null,
              isMandatory: true,
              checklistType: 'outgoing',
            };
            setTimeout(
              () => setOpenRemarksFor(JSON.stringify(recheckValidationInfo)),
              0,
            );
            document.body.classList.remove('dnd-updating');
            return;
          }
          // Safety net: config says source lane has mandatory outgoing but validation said no (e.g. config loaded after memo) — force-open outgoing checklist
          const forceOutgoing = getMandatoryOutgoingForLane(source.droppableId);
          if (forceOutgoing) {
            setColumns([...columns]);
            setPendingMoves((prev) => [
              ...prev,
              {
                candidateId: draggableId,
                sourceLaneId: source.droppableId,
                targetLaneId: destination.droppableId,
                sourceIndex: source.index,
                targetIndex: destination.index,
              },
            ]);
            const recheckValidationInfo: Record<string, unknown> = {
              ...dragInfo,
              checklist: forceOutgoing.checklist ?? null,
              isMandatory: true,
              checklistType: 'outgoing',
            };
            setTimeout(
              () => setOpenRemarksFor(JSON.stringify(recheckValidationInfo)),
              0,
            );
            document.body.classList.remove('dnd-updating');
            return;
          }
          // No checklist required, proceed with optimistic update and normal remarks dialog

          setColumns(newColumns);
          if (job?.promptForStatusChangeReason) {
            setOpenRemarksFor(draggableId);
          }
        }

        // Update candidate status in database (only for non-mandatory or no checklist cases)
        const updatedCandidate = await updateCandidate({
          _id: draggableId,
          status: destination.droppableId,
        }).unwrap();

        // Always send status mail when status is updated
        // If dialog opens and remark is added, another email will be sent with that remark
        sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: source.droppableId,
          },
          sendStatusMail,
          { remark: '' },
        );

        // Optional checklist: open after save so user can fill optionally
        if (optionalChecklistValidationInfo) {
          setOpenRemarksFor(optionalChecklistValidationInfo);
        }
      } catch {
        // Revert on error
        setColumns([...columns]);
        // If server required checklist but we didn't show it, open it now
        const candidateForCatch = sourceColumn.candidates.find(
          (c) => c._id === draggableId,
        );
        if (candidateForCatch) {
          const revalidate = validateCompleteMovement(
            candidateForCatch,
            source.droppableId,
            destination.droppableId,
          );
          if (
            revalidate.validation.requiresChecklist &&
            revalidate.validation.isMandatory
          ) {
            const hasPending =
              'pendingValidation' in revalidate &&
              revalidate.pendingValidation?.requiresChecklist &&
              'pendingType' in revalidate &&
              revalidate.pendingType;
            const validationInfo: Record<string, unknown> = {
              ...dragInfo,
              checklist:
                'checklist' in revalidate.validation
                  ? revalidate.validation.checklist
                  : null,
              isMandatory: revalidate.validation.isMandatory,
              checklistType: revalidate.type,
            };
            if (hasPending) validationInfo.hasPendingChecklist = true;
            setPendingMoves((prev) => [
              ...prev,
              {
                candidateId: draggableId,
                sourceLaneId: source.droppableId,
                targetLaneId: destination.droppableId,
                sourceIndex: source.index,
                targetIndex: destination.index,
              },
            ]);
            const validationInfoToOpen = JSON.stringify(validationInfo);
            setTimeout(() => setOpenRemarksFor(validationInfoToOpen), 0);
          }
        }
        toast({
          title: 'Error',
          description: 'Failed to validate or update candidate status',
          variant: 'destructive',
        });
      } finally {
        // Always remove the updating class
        document.body.classList.remove('dnd-updating');
      }
      await refetch();
      // Clear bulk selection only when no dialog was opened (no optional checklist, no prompt-for-reason)
      if (
        !optionalChecklistValidationInfo &&
        !job?.promptForStatusChangeReason
      ) {
        dispatch(clearSelectedCandidates());
      }
    } else {
      // Same lane movement, no checklist validation needed
      setColumns(newColumns);
    }
  };

  const handleCandidateUpdate = (updatedCandidate: Candidate) => {
    if (selectedCandidate?._id === updatedCandidate._id) {
      setSelectedCandidate(updatedCandidate);
    }

    setColumns((prevColumns) => {
      const hasTargetLane = prevColumns.some(
        (column) => column.id === updatedCandidate.status,
      );
      const candidateExists = prevColumns.some((column) =>
        column.candidates.some(
          (candidate) => candidate._id === updatedCandidate._id,
        ),
      );

      if (!hasTargetLane || !candidateExists) {
        return prevColumns;
      }

      return prevColumns.map((column) => ({
        ...column,
        candidates:
          column.id === updatedCandidate.status
            ? [
                updatedCandidate,
                ...column.candidates.filter(
                  (candidate) => candidate._id !== updatedCandidate._id,
                ),
              ]
            : column.candidates.filter(
                (candidate) => candidate._id !== updatedCandidate._id,
              ),
      }));
    });
  };

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

    try {
      if (selectedCandidate) {
        await deleteCandidate(selectedCandidate._id).unwrap();
      }

      setSelectedCandidate(null);
      toast({
        title: 'Success',
        description: `Candidate ${selectedCandidate?.isDeleted ? 'Unarchived' : 'Archived'} successfully`,
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
    handleCandidateUpdate,
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
