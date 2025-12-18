import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useGetBackupsQuery,
  useTakeSnapshotMutation,
  useDeleteBackupMutation,
} from '@/lib/features/settings';
import { BackupFile, BackupStats } from '../types';

export function useBackupsLogic() {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState('');

  const {
    data: backupsData,
    isLoading: isLoadingBackups,
    isError: isErrorBackups,
  } = useGetBackupsQuery();

  const [takeSnapshot, { isLoading: isTakingSnapshot }] =
    useTakeSnapshotMutation();

  const [deleteBackup, { isLoading: isDeletingBackup }] =
    useDeleteBackupMutation();

  const files: BackupFile[] = backupsData?.files || [];
  const globalLoading =
    isLoadingBackups || isTakingSnapshot || isDeletingBackup;

  // Calculate Stats
  const backupStats: BackupStats = useMemo(() => {
    if (files.length === 0) {
      return {
        totalSize: 0,
        totalCount: 0,
        oldestBackup: null,
        newestBackup: null,
        averageSize: 0,
      };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    // Sort needed for finding oldest/newest
    const sortedByDate = [...files].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return {
      totalSize,
      totalCount: files.length,
      oldestBackup: new Date(sortedByDate[0]?.createdAt).toLocaleString(),
      newestBackup: new Date(
        sortedByDate[sortedByDate.length - 1]?.createdAt,
      ).toLocaleString(),
      averageSize: totalSize / files.length,
    };
  }, [files]);

  // Prepared sorted files for display (Newest First)
  const sortedFiles = useMemo(
    () =>
      [...files]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .reverse(),
    [files],
  );

  // Handlers
  const handleTakeSnapshot = async () => {
    try {
      await takeSnapshot().unwrap();
      toast({
        title: 'Backup stored successfully',
        description: 'Database snapshot has been taken and saved successfully.',
      });
    } catch (err) {
      logger.error('Failed to create snapshot:', err);
      toast({
        title: 'Error',
        description: 'Failed to create database snapshot.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteBackup(fileToDelete).unwrap();
      toast({
        title: 'Backup deleted',
        description: `Backup ${fileToDelete} has been deleted successfully.`,
      });
      setIsDeleteDialogOpen(false);
      setFileToDelete('');
    } catch (err) {
      logger.error('Failed to delete backup:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete backup',
        variant: 'destructive',
      });
    }
  };

  const openDeleteDialog = (fileName: string) => {
    setFileToDelete(fileName);
    setIsDeleteDialogOpen(true);
  };

  return {
    files: sortedFiles,
    backupStats,
    isDeleteDialogOpen,
    fileToDelete,
    isLoadingBackups,
    isTakingSnapshot,
    isDeletingBackup,
    globalLoading,
    isErrorBackups,
    setIsDeleteDialogOpen,
    handleTakeSnapshot,
    handleConfirmDelete,
    openDeleteDialog,
  };
}
