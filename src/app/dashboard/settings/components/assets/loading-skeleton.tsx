import React from "react";

const AssetsLoadingSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 animate-pulse">
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-300 dark:bg-gray-700 rounded" />

          <div className="w-full flex items-center justify-between pr-4">
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>

            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsLoadingSkeleton;
