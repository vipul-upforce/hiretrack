import { FileIcon } from "lucide-react";

export function BackupSkeleton() {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <FileIcon className="h-4 w-4 text-gray-400" />
        <div className="h-3 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </h3>

      <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 px-4 border rounded-lg bg-white dark:bg-gray-900"
          >
            <div className="flex items-center space-x-3 w-full">
              <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex flex-col w-full space-y-2">
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </ul>
    </div>
  );
}
