import { Skeleton } from '@/components/ui/skeleton';

export function HistoryTimelineSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      <ol className="relative space-y-8 border-s border-gray-200 pl-6 dark:border-gray-700">
        {Array.from({ length: 4 }).map(() => (
          <li key={Math.random()} className="relative list-none">
            <div className="absolute -left-[29px] top-0 h-4 w-4 animate-pulse rounded-full border-2 border-background bg-accent" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>

              <Skeleton className="h-5 w-64" />

              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
