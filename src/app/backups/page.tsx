'use client';

import { FileIcon } from 'lucide-react';
import {
  useGetBackupsQuery,
  useDeleteBackupMutation,
  useTakeSnapshotMutation,
} from '@/lib/features/settings/settingsApi';
import logger from '@/lib/logger';

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
      logger.error('Failed to delete backup:', err);
    }
  };

  const handleSnapshot = async () => {
    try {
      await takeSnapshot().unwrap();
      refetch();
    } catch (err) {
      logger.error('Failed to take snapshot:', err);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading...</p>;
    }
    if (isError) {
      return <p className="text-red-500">Failed to load backups.</p>;
    }
    if (files.length === 0) {
      return <p>No backups found.</p>;
    }
    return (
      <ul className="space-y-2">
        {files.map((file: { name: string; url: string }) => (
          <div
            key={file.name}
            className="flex items-center justify-between rounded border p-2"
          >
            <div className="flex w-full items-center space-x-2">
              <FileIcon className="h-4 w-4" />
              <div className="flex w-full flex-col">
                <span className="w-full text-wrap break-all text-sm">
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
                type="button"
                onClick={() => handleDelete(file.name)}
                className="text-xs text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Available Backups</h1>
        <button
          type="button"
          onClick={handleSnapshot}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        >
          Take Snapshot
        </button>
      </div>

      {renderContent()}
    </div>
  );
}
