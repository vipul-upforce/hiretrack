import { Skeleton } from "../ui/skeleton";

export const InterviewerCardSkeleton = () => {
  return (
    <div className="w-[430px] h-auto border rounded-xl p-2 animate-pulse">
      <div className="space-y-7 p-2">
        <div className="flex flex-row justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20" />
        </div>
        {/* Position */}
        <div className="flex flex-row w-full gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex flex-col gap-2 w-full">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-[90%]" />
          </div>
        </div>
        {/* skills */}
        <div className="flex flex-row w-full gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex flex-col gap-2 w-full">
            <Skeleton className="h-5 w-20" />
            <div className="flex flex-wrap gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 " />
              ))}
            </div>
          </div>
        </div>
        {/* Date and time */}
        <div className="flex flex-row justify-between">
          <div className="flex flex-row w-full gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-[90%]" />
            </div>
          </div>
          <div className="flex flex-row w-full gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-[50%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
