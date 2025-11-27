import { Skeleton } from "@/components/ui/skeleton";

export default function NginxLogsSkeleton() {
  return (
    <div className="flex-1 flex min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="col-span-1 flex flex-col min-h-0">
          <Skeleton className="h-5 w-32 mb-2" />

          <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        </div>

        <div className="col-span-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex flex-row items-center w-[70%] gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-4 w-4 rounded-full" />{" "}
            </div>

            <div className="flex flex-row items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md flex-1 overflow-y-auto min-h-0 space-y-2"></div>
        </div>
      </div>
    </div>
  );
}
