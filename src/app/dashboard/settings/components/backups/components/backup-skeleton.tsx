import { FileIcon } from 'lucide-react';

export function BackupSkeleton() {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <FileIcon className="h-4 w-4 text-gray-400" />
        <div className="h-3 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </h3>

      <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
        {[...Array(4)].map((_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="flex items-center justify-between rounded-lg border bg-white p-3 px-4 dark:bg-gray-900"
          >
            <div className="flex w-full items-center space-x-3">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
              <div className="flex w-full flex-col space-y-2">
                <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                <div className="flex gap-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
              <div className="h-6 w-6 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </ul>
    </div>
  );
}
