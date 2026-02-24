/* eslint-disable react/no-array-index-key */

'use client';

function EmailTemplateSkeleton() {
  return (
    <div className="flex h-screen w-full animate-pulse flex-col overflow-hidden">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          {/* Breadcrumbs */}
          <div className="space-y-2">
            <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Save button skeleton */}
          <div className="h-10 w-32 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {/* Top section: Title + Dropdown */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2 h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-60 rounded bg-gray-200 dark:bg-gray-800" />
            </div>

            {/* Add Button */}
            <div className="h-9 w-28 rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Select dropdown skeleton */}
          <div className="max-w-md space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-[60px] w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Delete button (fake placeholder) */}
          <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Editor skeleton */}
          <div className="space-y-4 lg:col-span-2">
            <div className="space-y-4 rounded-lg border bg-white p-4 dark:bg-gray-900">
              {/* Editor Header */}
              <div className="flex justify-between">
                <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="flex gap-2">
                  <div className="h-8 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-8 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              </div>

              {/* Subject input skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-800" />
              </div>

              {/* Editor content skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-[300px] w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-4">
            {/* Variables card */}
            <div className="space-y-3 rounded-lg border bg-white p-4 dark:bg-gray-900">
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-full rounded bg-gray-200 dark:bg-gray-800"
                />
              ))}
            </div>

            {/* Info card */}
            <div className="space-y-3 rounded-lg border bg-white p-4 dark:bg-gray-900">
              <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800" />
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplateSkeleton;
