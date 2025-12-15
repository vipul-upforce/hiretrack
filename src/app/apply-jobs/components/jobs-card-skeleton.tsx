import { Skeleton } from '@/components/ui/skeleton';

export function JobCardSkeleton() {
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
      {/* Title */}
      <Skeleton className="h-6 w-3/4" />

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* Skills badges */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Experience and Salary */}
      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Footer text */}
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
