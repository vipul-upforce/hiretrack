export const JobCardSkeleton = () => (
  <div className="bg-white rounded-lg border-2 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
    <div className="flex flex-wrap gap-2 mt-4">
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
    </div>
    <div className="mt-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </div>
  </div>
);
