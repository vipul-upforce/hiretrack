"use client";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/components/ui/file-upload";
import { toast } from "@/hooks/use-toast";
import {
  FileIcon,
  LucideDownload,
  Trash,
  Database,
  Calendar,
  HardDrive,
  Camera,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  useGetBackupsQuery,
  useTakeSnapshotMutation,
  useDeleteBackupMutation,
} from "@/lib/features/settings/settingsApi";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type BackupFile = {
  name: string;
  url: string;
  createdAt: string;
  size: number;
};

export default function BackupsDialog() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState("");

  const {
    data: backupsData,
    isLoading: isLoadingBackups,
    isError: isErrorBackups,
  } = useGetBackupsQuery();
  const [
    takeSnapshot,
    { isLoading: isTakingSnapshot, isError: isErrorTakingSnapshot },
  ] = useTakeSnapshotMutation();
  const [
    deleteBackup,
    { isLoading: isDeletingBackup, isError: isErrorDeletingBackup },
  ] = useDeleteBackupMutation();

  const files: BackupFile[] = backupsData?.files || [];
  const loading = isLoadingBackups || isTakingSnapshot || isDeletingBackup;

  const backupStats = useMemo(() => {
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
    const sortedByDate = [...files].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      totalSize,
      totalCount: files.length,
      oldestBackup: new Date(sortedByDate[0]?.createdAt).toLocaleString(),
      newestBackup: new Date(
        sortedByDate[sortedByDate.length - 1]?.createdAt
      ).toLocaleString(),
      averageSize: totalSize / files.length,
    };
  }, [files]);

  const handleTakeSnapshot = async () => {
    try {
      await takeSnapshot().unwrap();
      toast({
        title: "Backup stored successfully",
        description: "Database snapshot has been taken and saved successfully.",
      });
    } catch (err) {
      console.error("Failed to create snapshot:", err);
      toast({
        title: "Error",
        description: "Failed to create database snapshot.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    try {
      await deleteBackup(fileName).unwrap();
      toast({
        title: "Backup deleted",
        description: `Backup ${fileName} has been deleted successfully.`,
      });
    } catch (err) {
      console.error("Failed to delete backup:", err);
      toast({
        title: "Error",
        description: `Failed to delete backup`,
        variant: "destructive",
      });
    }
  };

  if (isErrorBackups) {
    toast({
      title: "Error",
      description: "Failed to load backups.",
      variant: "destructive",
    });
  }

  return (
    <div className="flex-1 overflow-y-auto px-0 py-4 pt-0">
      {/* <div
        className="mb-6 p-6  rounded-xl border shadow-lg text-white"
        style={{
          backgroundColor: `rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)`,
          color: `var(--portal-primary, #6366f1)`,
          borderLeft: `3px solid var(--portal-primary, #6366f1)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Create New Backup</h3>
              <p className=" text-sm">
                Take a snapshot of your current database state
              </p>
            </div>
          </div>
          <Button
            onClick={handleTakeSnapshot}
            disabled={loading}
            className="bg-white text-blue-600 hover:bg-blue-50 font-medium px-6 py-2 h-auto"
          >
            {isTakingSnapshot ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Take Snapshot
              </>
            )}
          </Button>
        </div>
      </div> */}

      {files.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <div className="flex flex-row justify-between ">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup Summary
            </h3>
            <Button
              onClick={handleTakeSnapshot}
              disabled={loading}
              className="flex items-center justify-center font-semibold px-6 py-2 mb-2 rounded-lg transition-all duration-200 ease-in-out transform active:scale-95
             bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm
             dark:bg-blue-700 dark:text-white dark:border-blue-600 dark:hover:bg-blue-600 dark:shadow-md"
            >
              {isTakingSnapshot ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Take Snapshot
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Total Size:
              </span>
              <span className="font-medium">
                {formatFileSize(backupStats.totalSize)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileIcon className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Total Backups:
              </span>
              <span className="font-medium">{backupStats.totalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Oldest:</span>
              <span className="font-medium text-xs">
                {backupStats.oldestBackup}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Newest:</span>
              <span className="font-medium text-xs">
                {backupStats.newestBackup}
              </span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <HardDrive className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Average Size:
              </span>
              <span className="font-medium">
                {formatFileSize(backupStats.averageSize)}
              </span>
            </div>
          </div>
        </div>
      )}

      {files.length === 0 && !isLoadingBackups ? (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No backups found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first backup using the button above.
          </p>
        </div>
      ) : isLoadingBackups ? (
        <div className="h-[400px] flex justify-center itmes-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileIcon className="h-4 w-4" />
            Backup Files ({files.length})
          </h3>
          <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
            {[...files]
              .sort(
                // Sorts from oldest to newest
                (a, b) => a.createdAt.localeCompare(b.createdAt)
              )
              .map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 px-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <FileIcon className="h-4 w-4 text-gray-500" />
                    <div className="flex flex-col w-full">
                      <span className="text-sm w-full text-wrap break-all font-medium">
                        {file.name}
                      </span>
                      <div className="flex flex-row justify-start items-center gap-4">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(file.createdAt).toLocaleString("in-us")}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={file.url}
                      download={file.name}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      <LucideDownload className="w-4 h-4" />
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsDeleteDialogOpen(true);
                        setFileToDelete(file.name);
                      }}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
              .reverse()}
          </ul>
        </div>
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="w-[20vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the database backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteBackup(fileToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
