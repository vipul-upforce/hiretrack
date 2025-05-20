import { toast } from "@/hooks/use-toast";
import { CandidateColumn, CandidateStatus } from "@/types/candidate";
import { User } from "@/lib/features/users/usersApi";
import {
  useUpdateLanesMutation,
  useDeleteLaneMutation,
} from "@/lib/features/lane/laneApi";
interface UseKanbanBoardProps {
  columns: CandidateColumn[];
  setColumns: (columns: CandidateColumn[]) => void;
  user: User | null;
  setIsConfirmLaneDeleteOpen: (open: boolean) => void;
  refetch: () => Promise<any>;
}

export const useKanbanBoard = ({
  columns,
  setColumns,
  user,
  setIsConfirmLaneDeleteOpen,
  refetch,
}: UseKanbanBoardProps) => {
  const [updateLanes] = useUpdateLanesMutation();
  const [deleteLane] = useDeleteLaneMutation();

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

  const handleAddLane = (title: string) => {
    const newLaneId = title.toLowerCase().replace(/\s+/g, "-");
    const isDuplicate = columns.some((column) => column.id === newLaneId);
    if (isDuplicate) {
      toast({
        title: "Error",
        description: `Lane with title "${title}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    const newLane: CandidateColumn = {
      id: newLaneId as CandidateStatus,
      title,
      candidates: [],
    };
    updateLanesOrder([...columns, newLane]);
    setColumns([...columns, newLane]);
  };

  const handleDeleteLane = () => {
    setIsConfirmLaneDeleteOpen(true);
  };

  const handleConfirmDeleteLane = async (laneId: string) => {
    if (!user?.id) return;

    try {
      await deleteLane({
        organizationId: user.organizationId,
        laneId,
      }).unwrap();
      toast({
        title: "Lane deleted",
        description: "Lane deleted successfully",
        variant: "default",
      });
      const newColumns = columns.filter((col) => col.id !== laneId);
      setColumns(newColumns);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "data" in err) {
        const errorMessage =
          (err.data as { error: string }).error || "Failed to delete the lane";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const errorMessage = "An unknown error occurred";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    setIsConfirmLaneDeleteOpen(false);
    await refetch();
  };

  return {
    updateLanesOrder,
    handleAddLane,
    handleDeleteLane,
    handleConfirmDeleteLane,
  };
};
