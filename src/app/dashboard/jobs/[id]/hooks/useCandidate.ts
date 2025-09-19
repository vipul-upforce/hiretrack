import { DropResult } from "@hello-pangea/dnd";
import { toast } from "@/hooks/use-toast";
import { Candidate, CandidateColumn, CandidateStatus } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import { useState } from "react";
import {
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { useUpdateLanesMutation } from "@/lib/features/lane/laneApi";
import { useSendStatusMailMutation } from "@/lib/features/org/orgApi";
import { useValidateCandidateChecklistMutation } from "@/lib/features/checklist/checklistApi";
import { sentStatusMailHandler } from "@/lib/utils";
import { useClientSideChecklistValidation } from "./useClientSideChecklistValidation";
import { Job } from "@/types/job";

interface UseCandidateProps {
  columns: CandidateColumn[];
  setColumns: (columns: CandidateColumn[]) => void;
  user: User | null;
  setOpenRemarksFor: (id: string | null) => void;
  setIsDialogOpen: (open: boolean) => void;
  setDroppedFileData: (file: File | null) => void;
  setCandidateToDelete: (id: string | null) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  selectedCandidate: Candidate | null;
  refetch: () => Promise<any>;
  candidateToDelete: string | null;
  jobLaneConfig?: any;
  job?: Job;
  // promptForStatusChangeReason: boolean;
}

interface ChecklistValidationResult {
  candidateId: string;
  currentLane: string;
  targetLane: string;
  checklist?: any;
  isMandatory?: boolean;
}

interface PendingMove {
  candidateId: string;
  sourceLaneId: string;
  targetLaneId: CandidateStatus;
  sourceIndex: number;
  targetIndex: number;
}

export const useCandidate = ({
  columns,
  setColumns,
  user,
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
  // promptForStatusChangeReason,
}: UseCandidateProps) => {
  const [updateCandidate] = useUpdateCandidateMutation();
  const [deleteCandidate] = useDeleteCandidateMutation();
  const [updateLanes] = useUpdateLanesMutation();
  const [sendStatusMail] = useSendStatusMailMutation();
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);

  // Initialize client-side checklist validation
  const { validateCompleteMovement } = useClientSideChecklistValidation(
    jobLaneConfig,
    user?.role
  );

  // Function to complete a pending move (move card and update database)
  const completePendingMove = async (candidateId: string) => {
    const pendingMove = pendingMoves.find(
      (pm) => pm.candidateId === candidateId
    );
    if (!pendingMove) return;

    try {
      // Update the UI - move the card to target lane
      // Extract the logic outside setColumns
      const prevColumns = columns;
      const newColumns = [...prevColumns];
      const sourceColumnIndex = newColumns.findIndex(
        (col) => col.id === pendingMove.sourceLaneId
      );
      const targetColumnIndex = newColumns.findIndex(
        (col) => col.id === pendingMove.targetLaneId
      );

      if (sourceColumnIndex >= 0 && targetColumnIndex >= 0) {
        const sourceColumn = newColumns[sourceColumnIndex];
        const targetColumn = newColumns[targetColumnIndex];

        // Find and remove candidate from source
        const candidateToMove = sourceColumn.candidates.find(
          (c) => c._id === candidateId
        );
        if (candidateToMove) {
          const newSourceCandidates = sourceColumn.candidates.filter(
            (candidate) => candidate._id !== candidateId
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

      // Send status change email
      sentStatusMailHandler(
        {
          ...updatedCandidate,
          prev_status: pendingMove.sourceLaneId,
        },
        sendStatusMail
      );

      // Remove from pending moves
      setPendingMoves((prev) =>
        prev.filter((pm) => pm.candidateId !== candidateId)
      );

      // Refetch to ensure consistency
      await refetch();
    } catch (error) {
      // If database update fails, don't move the card
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive",
      });
    }
  };

  // Function to cancel a pending move (just remove from pending moves)
  const cancelPendingMove = (candidateId: string) => {
    const pendingMove = pendingMoves.find(
      (pm) => pm.candidateId === candidateId
    );
    if (!pendingMove) return;

    // For mandatory checklists, the card was never moved, so just remove from pending
    setPendingMoves((prev) =>
      prev.filter((pm) => pm.candidateId !== candidateId)
    );
  };

  const updateLanesOrder = async (newColumns: CandidateColumn[]) => {
    const lansArray = newColumns.map((column) => column.id);
    try {
      await updateLanes({
        userId: user?.id || "",
        lanes: lansArray,
      }).unwrap();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, type, draggableId } = result;

    if (!destination) {
      return;
    }

    if (type === "lane") {
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
      (col) => col.id === destination.droppableId
    );

    if (!sourceColumn || !destColumn) return;

    const newColumns = [...columns];
    const sourceColumnIndex = columns.findIndex(
      (col) => col.id === source.droppableId
    );
    const destColumnIndex = columns.findIndex(
      (col) => col.id === destination.droppableId
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
      (c) => c._id === draggableId
    );
    if (sourceIndex === -1) {
      console.error("Could not find candidate with ID:", draggableId);
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
      try {
        // Add a class to prevent flicker during the critical update phase
        document.body.classList.add("dnd-updating");

        // Get the candidate being moved by ID instead of index
        // This ensures we get the correct candidate regardless of sorting
        const candidate = sourceColumn.candidates.find(
          (c) => c._id === draggableId
        );
        if (!candidate) {
          console.error("Candidate not found for drag operation");
          document.body.classList.remove("dnd-updating");
          return;
        }

        // Use client-side validation to check if checklist is needed
        const validationResult = validateCompleteMovement(
          candidate,
          source.droppableId,
          destination.droppableId
        );

        // Handle movement based on checklist requirements
        if (validationResult.validation.requiresChecklist) {
          const validationInfo = {
            ...dragInfo,
            checklist:
              "checklist" in validationResult.validation
                ? validationResult.validation.checklist
                : null,
            isMandatory: validationResult.validation.isMandatory,
            checklistType: validationResult.type,
          };

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
            // if (promptForStatusChangeReason) {
            setOpenRemarksFor(JSON.stringify(validationInfo));
            // }
            return; // Exit early, don't update database
          } else {
            // For OPTIONAL checklists: Move the card optimistically
            setColumns(newColumns);
            // Continue to database update below
          }

          // Show dialog with checklist for optional checklists
          // if (promptForStatusChangeReason) {
          setOpenRemarksFor(JSON.stringify(validationInfo));
          // }
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

        sentStatusMailHandler(
          {
            ...updatedCandidate,
            prev_status: source.droppableId,
          },
          sendStatusMail
        );
      } catch (error) {
        // Revert on error
        setColumns([...columns]);
        toast({
          title: "Error",
          description: "Failed to validate or update candidate status",
          variant: "destructive",
        });
      } finally {
        // Always remove the updating class
        document.body.classList.remove("dnd-updating");
      }
      await refetch();
    } else {
      // Same lane movement, no checklist validation needed
      setColumns(newColumns);
    }
  };

  const handleCandidateUpdate = (updatedCandidate: Candidate) => {
    const newColumns = columns.map((column) => ({
      ...column,
      candidates: column.candidates.map((candidate) =>
        candidate._id === updatedCandidate._id ? updatedCandidate : candidate
      ),
    }));
    setColumns(newColumns);
  };

  const handleFileDrop = async (file: File) => {
    setIsDialogOpen(true);
    if (file.type === "application/pdf") {
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
        title: "Success",
        description: `Candidate ${selectedCandidate?.isDeleted ? "Unarchived" : "Archived"} successfully`,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update candidate status",
          variant: "destructive",
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
  };
};
