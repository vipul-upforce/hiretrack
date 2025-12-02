"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useBackupsLogic } from "./hooks/useBackupLogic";
import { BackupSummaryCard } from "./components/backup-summary-card";
import { BackupSkeleton } from "./components/backup-skeleton";
import { BackupEmptyState } from "./components/backup-empty-state";
import { BackupList } from "./components/backup-list";
import { DeleteBackupDialog } from "./components/delete-backup-dialog";

export default function BackupsDialog() {
  const { toast } = useToast();
  const {
    files,
    backupStats,
    isDeleteDialogOpen,
    isLoadingBackups,
    isTakingSnapshot,
    globalLoading,
    isErrorBackups,
    setIsDeleteDialogOpen,
    handleTakeSnapshot,
    handleConfirmDelete,
    openDeleteDialog,
  } = useBackupsLogic();

  useEffect(() => {
    if (isErrorBackups) {
      toast({
        title: "Error",
        description: "Failed to load backups.",
        variant: "destructive",
      });
    }
  }, [isErrorBackups, toast]);

  return (
    <div className="flex-1 overflow-y-auto px-0 py-4 pt-0">
      <BackupSummaryCard
        stats={backupStats}
        onTakeSnapshot={handleTakeSnapshot}
        isTakingSnapshot={isTakingSnapshot}
        disabled={globalLoading}
      />

      {isLoadingBackups ? (
        <BackupSkeleton />
      ) : files.length === 0 ? (
        <BackupEmptyState />
      ) : (
        <BackupList
          files={files}
          loading={globalLoading}
          onDelete={openDeleteDialog}
        />
      )}

      <DeleteBackupDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
