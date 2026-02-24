import { Skeleton } from '@/components/ui/skeleton';

export function EvaluationSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {/* Temperature Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-full rounded-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      <div className="border-t pt-4 space-y-4">
        {/* Auto Eval Skeleton */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        {/* Max Pages Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="mb-2">
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-3 w-72" />
        </div>

        {/* Toggles Skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-80" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        ))}
      </div>

      {/* Custom Prompt Skeleton */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    </div>
  );
}
