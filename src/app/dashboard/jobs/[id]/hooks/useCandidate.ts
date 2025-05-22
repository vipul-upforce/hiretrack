import { DropResult } from "@hello-pangea/dnd";
import { toast } from "@/hooks/use-toast";
import { Candidate, CandidateColumn } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import {
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
} from "@/lib/features/candidate/candidateApi";
import { useUpdateLanesMutation } from "@/lib/features/lane/laneApi";
import { useSendStatusMailMutation } from "@/lib/features/org/orgApi";
import { sentStatusMailHandler } from "@/lib/utils";

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
}: UseCandidateProps) => {
  const [updateCandidate] = useUpdateCandidateMutation();
  const [deleteCandidate] = useDeleteCandidateMutation();
  const [updateLanes] = useUpdateLanesMutation();
  const [sendStatusMail] = useSendStatusMailMutation();

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

    if (source.droppableId !== destination.droppableId) {
      setOpenRemarksFor(draggableId);
    }

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

    const newSourceCandidates = [...sourceColumn.candidates];
    const newDestCandidates =
      source.droppableId === destination.droppableId
        ? newSourceCandidates
        : [...destColumn.candidates];

    const [removed] = newSourceCandidates.splice(source.index, 1);

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

    setColumns(newColumns);

    if (source.droppableId !== destination.droppableId) {
      try {
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
      } catch {
        setColumns([...columns]);
        toast({
          title: "Error",
          description: "Failed to update candidate status umiejscowienie",
          variant: "destructive",
        });
      }
      await refetch();
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
  };
};
