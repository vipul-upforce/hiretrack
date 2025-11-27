"use client";

const EmailTemplateSkeleton = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Breadcrumbs */}
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>

          {/* Save button skeleton */}
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto space-y-6">
        {/* Top section: Title + Dropdown */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
              <div className="h-3 w-60 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>

            {/* Add Button */}
            <div className="h-9 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>

          {/* Select dropdown skeleton */}
          <div className="space-y-2 max-w-md">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-[60px] w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>

          {/* Delete button (fake placeholder) */}
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor skeleton */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-900">
              {/* Editor Header */}
              <div className="flex justify-between">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
              </div>

              {/* Subject input skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded" />
              </div>

              {/* Editor content skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-[300px] w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-4">
            {/* Variables card */}
            <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-900">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded"
                />
              ))}
            </div>

            {/* Info card */}
            <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-900">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateSkeleton;
