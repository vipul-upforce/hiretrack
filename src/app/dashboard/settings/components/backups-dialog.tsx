"use client";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/components/ui/file-upload";
import { toast } from "@/hooks/use-toast";
import { FileIcon, LucideDownload, Trash } from "lucide-react";
import { useEffect, useState } from "react";
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

type BackupFile = {
  name: string;
  url: string;
  createdAt: string;
  size: number;
};

export default function BackupsDialog() {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState("");

  const [loading, setLoading] = useState(true);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/backups");
      if (!res.ok) {
        throw new Error("Failed to fetch backups");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Failed to load backups:", err);
      toast({
        title: "Error",
        description: "Failed to load backups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const takeSnapShot = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/take-snapshot");
      if (!res.ok) {
        throw new Error("Failed to create snapshot");
      }
      const data = await res.json();
      if (data.archive) {
        toast({
          title: "Backup stored successfully",
          description:
            "Database snapshot has been taken and saved successfully.",
        });
        await fetchBackups();
      }
    } catch (err) {
      console.error("Failed to create snapshot:", err);
      toast({
        title: "Error",
        description: "Failed to create database snapshot.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (fileName: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/take-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete backup");
      }
      toast({
        title: "Backup deleted",
        description: `Backup ${fileName} has been deleted successfully.`,
      });
      await fetchBackups(); // Refresh the file list after deletion
    } catch (err) {
      console.error("Failed to delete backup:", err);
      toast({
        title: "Error",
        description: `Failed to delete backup`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="">
      <Button className="w-full mb-2" onClick={takeSnapShot} disabled={loading}>
        Take a database snapshot
      </Button>
      {files.length === 0 ? (
        <p>No backups found.</p>
      ) : (
        <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
          {files
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )

            .map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 px-4 border rounded"
              >
                <div className="flex items-center space-x-2 w-full">
                  <FileIcon className="h-4 w-4" />
                  <div className="flex flex-col w-full">
                    <span className="text-sm w-full text-wrap break-all">
                      {file.name}
                    </span>
                    <div className="flex flex-row justify-start items-center">
                      <span className="text-xs text-gray-500">
                        {file.createdAt}
                        {/* {new Date(file.createdAt).toDateString()}{" "}
                        {new Date(file.createdAt).toTimeString()} */}
                        {/* {formatTime(new Date(file.createdAt))}{" "}
                        {formatDate(new Date(file.createdAt))} */}
                      </span>
                      <span className="text-xs ml-6 text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    download={file.name}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    <LucideDownload className="text-xs w-4" />
                  </a>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsDeleteDialogOpen(true);
                      setFileToDelete(file.name);
                    }}
                    disabled={loading}
                  >
                    <Trash />
                  </Button>
                </div>
              </div>
            ))
            .reverse()}
        </ul>
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
              onClick={() => deleteBackup(fileToDelete)}
              className={"text-white bg-red-600 hover:bg-red-700"}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
