import { Skeleton } from '@/components/ui/skeleton';

export default function CaptchaSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden duration-200 animate-in fade-in">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {/* Setup Instructions Skeleton */}
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center gap-3 px-4 py-5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="ml-auto mr-2 flex items-center">
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Form Fields Skeleton */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Enable Toggle Skeleton */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-2 border-t border-border/10 px-6 py-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}
