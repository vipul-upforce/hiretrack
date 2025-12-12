import { Skeleton } from '@/components/ui/skeleton';

export default function NginxLogsSkeleton() {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-4">
        <div className="col-span-1 flex min-h-0 flex-col">
          <Skeleton className="mb-2 h-5 w-32" />

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {Array.from({ length: 8 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        </div>

        <div className="col-span-3 flex min-h-0 flex-col">
          <div className="mb-4 flex flex-shrink-0 items-center justify-between">
            <div className="flex w-[70%] flex-row items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-4 w-4 rounded-full" />{' '}
            </div>

            <div className="flex flex-row items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md bg-muted p-4" />
        </div>
      </div>
    </div>
  );
}

export function LogSkeleton() {
  return (
    <div className="w-full space-y-2">
      {Array.from({ length: 15 }).map((_, i) => {
        const randomWidth = Math.floor(Math.random() * 40) + 60;
        return (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="h-5 rounded-md bg-muted-foreground/10"
            style={{ width: `${randomWidth}%` }}
          />
        );
      })}
    </div>
  );
}
