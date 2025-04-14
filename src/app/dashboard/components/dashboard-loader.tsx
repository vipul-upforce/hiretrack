import { Skeleton } from "@/components/ui/skeleton";

const DashboardLoader = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        className="rounded-xl border bg-card text-card-foreground shadow"
        key={i}
      >
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="text-lg font-semibold py-2 leading-none tracking-tight">
            <Skeleton className="w-1/2 h-[20px] rounded-lg" />
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground flex flex-row justify-start items-center">
              Position: <Skeleton className="w-1/3 h-[16px] rounded-lg" />
            </div>
            <div
              className="text-sm text-muted-foreground flex flex-wrap align-center"
              style={{ alignItems: "center" }}
            >
              Skills:
              <Skeleton className="w-28 h-[28px] rounded-lg" />
            </div>
            <div
              className="text-sm text-muted-foreground flex flex-wrap align-center"
              style={{ alignItems: "center" }}
            >
              Status:
              <Skeleton className="w-1/3 h-[16px] rounded-lg" />
            </div>
            <div
              className="text-sm text-muted-foreground flex flex-wrap align-center"
              style={{ alignItems: "center" }}
            >
              Date:
              <Skeleton className="w-1/3 h-[16px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default DashboardLoader;
