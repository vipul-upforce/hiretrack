import { Skeleton } from '../ui/skeleton';

export function InterviewerCardSkeleton() {
  return (
    <div className="group relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-xl border border-border/50 bg-background p-0 animate-pulse">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/40 bg-muted/10 p-5">
        <div className="flex min-w-0 flex-col gap-2 w-full pr-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        <Skeleton className="h-5 w-20 rounded-md" />
      </div>

      {/* Content */}
      <div className="flex flex-col p-5">

        {/* Schedule module */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border/40 bg-muted/20 p-4 sm:flex-row sm:items-center">

          {/* Date */}
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          <div className="hidden h-10 w-px bg-border/60 sm:block" />

          {/* Time */}
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

        </div>

        {/* Skills */}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-28" />

          <div className="flex flex-wrap gap-2">
            {[...Array(4)].map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} className="h-6 w-16 rounded-md" />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}