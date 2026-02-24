import { DropResult } from '@hello-pangea/dnd';
import { toast } from '@/hooks/use-toast';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import { useState } from 'react';
import {
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
} from '@/lib/features/candidate/candidateApi';
import { useUpdateLanesMutation } from '@/lib/features/lane/laneApi';
import { useSendStatusMailMutation } from '@/lib/features/org/orgApi';
import { sentStatusMailHandler } from '@/lib/utils';
import { Job } from '@/types/job';
import logger from '@/lib/logger';
import { IJobLaneConfig } from '@/lib/models/JobLaneConfig';
import { useAppSelector } from '@/lib/redux/hooks';
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
  setPendingStatusAfterChecklist?: (v: PendingStatusAfterChecklist | null) => void;
  /** After applying deferred status (single or bulk), call so page can process next in bulk queue */
  onBulkQueueStepComplete?: () => void;
  /** Current bulk status queue; used so checklist complete can advance queue for optional bulk items */
  bulkStatusQueue?: { candidateId: string; newStatus: string; validationInfo?: string }[] | null;
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
    onBulkQueueStepComplete,
    bulkStatusQueue,
}: UseCandidateProps) => {
  const [updateCandidate] = useUpdateCandidateMutation();
  const [deleteCandidate] = useDeleteCandidateMutation();
  const [updateLanes] = useUpdateLanesMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [pendingChecklists, setPendingChecklists] = useState<PendingChecklist[]>([]);

  const { user } = useAppSelector((state) => state.auth);

  // Initialize client-side checklist validation
  const { validateCompleteMovement } = useClientSideChecklistValidation(
    jobLaneConfig,
    user?.role,
  );

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
      // Update candidate status in database
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
    const pendingMove = pendingMoves.find(
      (pm) => pm.candidateId === candidateId,
    );
    if (!pendingMove) return;

    // For mandatory checklists, the card was never moved, so just remove from pending
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
    // Status was deferred from unified dialog (single or bulk); apply it now and clear pending
    if (
      pendingStatusAfterChecklist?.candidateId === candidateId &&
      setPendingStatusAfterChecklist
    ) {
      updateCandidate({
        _id: candidateId,
        status: pendingStatusAfterChecklist.newStatus as CandidateStatus,
      })
        .unwrap()
        .then(() => refetch())
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

      // Show the pending checklist dialog
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
      // No pending checklist, complete the move
      completePendingMove(candidateId);
    }
  };

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

        // Handle movement based on checklist requirements
        if (validationResult.validation.requiresChecklist) {
          const validationInfo = {
            ...dragInfo,
            checklist:
              'checklist' in validationResult.validation
                ? validationResult.validation.checklist
                : null,
            isMandatory: validationResult.validation.isMandatory,
            checklistType: validationResult.type,
          };

          // Queue pending incoming checklist if both outgoing and incoming are required
          if (
            'pendingValidation' in validationResult &&
            validationResult.pendingValidation?.requiresChecklist &&
            'pendingType' in validationResult &&
            validationResult.pendingType
          ) {
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

          if (validationResult.validation.isMandatory) {
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

            // Show dialog with checklist - NO database update yet
            setOpenRemarksFor(JSON.stringify(validationInfo));
            return; // Exit early, don't update database
          }
          // For OPTIONAL checklists: Move the card optimistically; do NOT open checklist yet.
          // Checklist will open after updateCandidate succeeds below.
          optionalChecklistValidationInfo = JSON.stringify(validationInfo);
          setColumns(newColumns);
        } else {
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
        column.candidates.some((candidate) => candidate._id === updatedCandidate._id),
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
    handleCandidateUpdate,
    handleFileDrop,
    handleDeleteClick,
    handleDeleteConfirm,
    pendingMoves,
    completePendingMove,
    cancelPendingMove,
    handleChecklistComplete,
    pendingChecklists,
  };
};
