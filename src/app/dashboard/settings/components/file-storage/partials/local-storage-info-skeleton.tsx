import { Skeleton } from '@/components/ui/skeleton';

export function LocalStorageInfoSkeleton() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[92%]" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="col-span-12 rounded-xl border bg-card p-6 shadow-sm md:col-span-7 lg:col-span-8">
          <div className="mb-5 flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>

        <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-5 md:grid-cols-1 lg:col-span-4 lg:grid-cols-1">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
