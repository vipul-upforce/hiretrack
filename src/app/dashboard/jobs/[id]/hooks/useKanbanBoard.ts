import { toast } from '@/hooks/use-toast';
import { CandidateColumn, CandidateStatus } from '@/types/candidate';
import {
  useUpdateLanesMutation,
  useDeleteLaneMutation,
  useDeleteJobLaneMutation,
  useEditLaneMutation,
  useRenameJobLaneMutation,
} from '@/lib/features/lane/laneApi';
import { useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';

interface UseKanbanBoardProps {
  columns: CandidateColumn[];
  setColumns: (columns: CandidateColumn[]) => void;
  jobId?: string; // NEW: Add jobId for job-specific operations
  setIsConfirmLaneDeleteOpen: (open: boolean) => void;
  setIsLaneEditOpen: (open: boolean) => void;
  refetch: () => Promise<void>;
}

export const useKanbanBoard = ({
  columns,
  setColumns,
  jobId,
  setIsConfirmLaneDeleteOpen,
  setIsLaneEditOpen,
  refetch,
}: UseKanbanBoardProps) => {
  const [updateLanes] = useUpdateLanesMutation();
  const [editLane] = useEditLaneMutation();
  const [deleteLane] = useDeleteLaneMutation(); // Keep for backward compatibility
  const [deleteJobLane] = useDeleteJobLaneMutation(); // NEW: Job-specific deletion
  const [renameJobLane] = useRenameJobLaneMutation(); // NEW: Job-specific renaming
  const [migrationLanes, setMigrationLanes] = useState<string[]>([]);
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [laneToDelete, setLaneToDelete] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  const updateLanesOrder = async (newColumns: CandidateColumn[]) => {
    const lansArray = newColumns.map((column) => column.id);
    try {
      // NEW: Use job-specific lanes if jobId is provided
      const updateData: { userId: string; lanes: string[]; jobId?: string } = {
        userId: user?.id || '',
        lanes: lansArray,
        jobId: jobId || undefined,
      };

      if (jobId) {
        updateData.jobId = jobId;
      }

      await updateLanes(updateData).unwrap();

      toast({
        title: 'Success',
        description: jobId
          ? 'Job lanes updated successfully'
          : 'Lanes updated successfully',
      });
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

  const handleAddLane = (title: string) => {
    const newLaneId = title.toLowerCase().replace(/\s+/g, '-');
    const isDuplicate = columns.some((column) => column.id === newLaneId);
    if (isDuplicate) {
      toast({
        title: 'Error',
        description: `Lane with title "${title}" already exists.`, // Corrected escaping for consistency
        variant: 'destructive',
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
  const handleEditLaneClick = () => {
    setIsLaneEditOpen(true);
  };

  const handleConfirmDeleteLane = async (laneId: string) => {
    if (!user?.id) return;

    try {
      // NEW: Use job-specific deletion if jobId is provided
      if (jobId) {
        await deleteJobLane({
          jobId,
          laneName: laneId,
        }).unwrap();
        toast({
          title: 'Lane deleted',
          description: 'Lane deleted from this job successfully',
          variant: 'default',
        });
      } else {
        // Fallback to organization-wide deletion (for default lanes management)
        await deleteLane({
          organizationId: user.organizationId,
          laneId,
        }).unwrap();
        toast({
          title: 'Lane deleted',
          description: 'Lane deleted successfully',
          variant: 'default',
        });
      }

      const newColumns = columns.filter((col) => col.id !== laneId);
      setColumns(newColumns);
    } catch (err: unknown) {
      if (
        (err as { data?: { migrationNeeded: boolean } }).data?.migrationNeeded
      ) {
        setLaneToDelete(laneId);
        setMigrationLanes(
          (err as { data?: { lanes: string[] } }).data?.lanes || [],
        );
        setIsMigrationDialogOpen(true);
      } else {
        const errorMessage =
          (err as { data?: { error: string } }).data?.error ||
          'Failed to delete the lane';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
    setIsConfirmLaneDeleteOpen(false);
    await refetch();
  };

  const handleMigrateAndDeleteLane = async (migrationLane: string) => {
    if (!user?.id || !laneToDelete) return;

    try {
      if (jobId) {
        await deleteJobLane({
          jobId,
          laneName: laneToDelete,
          migrationLane,
        }).unwrap();
        toast({
          title: 'Lane deleted',
          description: 'Lane deleted and candidates migrated successfully',
          variant: 'default',
        });
      }
      const newColumns = columns.filter((col) => col.id !== laneToDelete);
      setColumns(newColumns);
    } catch (err: unknown) {
      const errorMessage =
        (err as { data?: { error: string } }).data?.error ||
        'Failed to delete the lane';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    setIsMigrationDialogOpen(false);
    await refetch();
  };

  const handleEditLane = async (prevLaneId: string, laneId: string) => {
    if (!user?.id || !prevLaneId || !laneId) return;

    try {
      // NEW: Use job-specific renaming if jobId is provided
      if (jobId) {
        await renameJobLane({
          jobId,
          laneName: prevLaneId,
          newLaneName: laneId,
        }).unwrap();
        toast({
          title: 'Success',
          description: 'Lane renamed for this job successfully',
          variant: 'default',
        });
      } else {
        // Fallback to organization-wide renaming (for default lanes management)
        await editLane({
          organizationId: user.organizationId as string,
          prevLaneId,
          newLaneId: laneId,
        }).unwrap();
        toast({
          title: 'Success',
          description: 'Lane edited successfully',
          variant: 'default',
        });
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err) {
        const errorMessage =
          (err.data as { error: string }).error || 'Failed to edit the lane';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        const errorMessage = 'An unknown error occurred';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
    setIsLaneEditOpen(false);
    await refetch();
  };

  return {
    updateLanesOrder,
    handleAddLane,
    handleDeleteLane,
    handleEditLaneClick,
    handleEditLane,
    handleConfirmDeleteLane,
    handleMigrateAndDeleteLane,
    migrationLanes,
    isMigrationDialogOpen,
    setIsMigrationDialogOpen,
    laneToDelete,
    setLaneToDelete,
  };
};
