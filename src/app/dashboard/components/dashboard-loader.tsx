import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DashboardLoader = () => (
  // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="flex flex-wrap gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      // <div
      //   className="rounded-xl border bg-card text-card-foreground shadow"
      //   key={i}
      // >
      <div
        key={i}
        className={cn(
          "bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg  shadow-sm cursor-pointer hay-700 w-[420px] flex-shrink-0"
        )}>
        {/* <div className="flex flex-col space-y-1.5 p-6">
          <div className="text-lg font-semibold py-2 leading-none tracking-tight">
            <Skeleton className="w-1/2 h-[20px] rounded-lg" />
          </div>
        </div> */}
        {/* <div className="p-2 "> */}
        <Skeleton className="w-full h-[500px] p-6 rounded-lg" />
        {/* <div className="space-y-2">
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
          </div> */}
        {/* </div> */}
      </div>
    ))}
  </div >
);

export default DashboardLoader;
