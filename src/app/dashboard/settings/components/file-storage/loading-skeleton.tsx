import { Skeleton } from '@/components/ui/skeleton';
import { LocalStorageInfoSkeleton } from './partials/local-storage-info-skeleton';

export default function FileStorageLoadingSkeleton() {
  return (
    <div className="px-6 py-4 space-y-6 animate-in fade-in duration-200">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((id) => (
          <div
            key={id}
            className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[95%]" />
          <Skeleton className="h-3 w-[90%]" />
        </div>
      </div>

      <LocalStorageInfoSkeleton />

      <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
