export function DiskSpaceSkeleton() {
  return (
    <div className="w-[95%] mx-auto space-y-6 mb-8">
      {/* 1. Stats Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Main Card Skeleton */}
        <div className="col-span-12 flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm md:col-span-7 lg:col-span-8">
          <div className="mb-6 flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <div className="h-8 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-8 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-6 rounded bg-muted animate-pulse" />
              <div className="h-3 w-6 rounded bg-muted animate-pulse" />
              <div className="h-3 w-6 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
          </div>
        </div>

        {/* Side Cards Skeleton */}
        <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-5 md:grid-cols-1 lg:col-span-4 lg:grid-cols-1">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Folder List Skeleton */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-muted/60 px-4 py-2 border-b flex justify-between items-center h-[37px]">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded border bg-background animate-pulse" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full flex items-center justify-between px-4 py-3 bg-background"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
