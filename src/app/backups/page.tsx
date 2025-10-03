"use client";

import { FileIcon } from "lucide-react";
import { useGetBackupsQuery, useDeleteBackupMutation, useTakeSnapshotMutation } from "@/lib/features/settings/settingsApi";

export default function BackupsDialog() {
  const { data, isLoading, isError, refetch } = useGetBackupsQuery();
  const [deleteBackup] = useDeleteBackupMutation();
  const [takeSnapshot] = useTakeSnapshotMutation();

  const files = data?.files || [];

  const handleDelete = async (fileName: string) => {
    try {
      await deleteBackup(fileName).unwrap();
      refetch(); // refresh list
    } catch (err) {
      console.error("Failed to delete backup:", err);
    }
  };

  const handleSnapshot = async () => {
    try {
      await takeSnapshot().unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to take snapshot:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Available Backups</h1>
        <button
          onClick={handleSnapshot}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Take Snapshot
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : isError ? (
        <p className="text-red-500">Failed to load backups.</p>
      ) : files.length === 0 ? (
        <p>No backups found.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file: { name: string; url: string }, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center space-x-2 w-full">
                <FileIcon className="h-4 w-4" />
                <div className="flex flex-col w-full">
                  <span className="text-sm w-full text-wrap break-all">
                    {file.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={file.url}
                  download={file.name}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => handleDelete(file.name)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
