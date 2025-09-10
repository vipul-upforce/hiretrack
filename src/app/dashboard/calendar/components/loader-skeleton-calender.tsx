import { Skeleton } from "@/components/ui/skeleton";

const LoaderSkeletonCalendar = () => (
  <div className="space-y-6">
    <div className="flex justify-between border-b items-center  text-card-foreground shadow p-6">
      <div className="font-semibold leading-none tracking-tight">
        Calendar
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-80 h-[40px] rounded-lg" />
        <Skeleton className="w-40 h-[40px] rounded-lg" />
        <Skeleton className="w-40 h-[40px] rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 px-6">
      {/* Left Section - Calendar Skeleton */}
      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <Skeleton className="w-full h-[600px] rounded-lg" />
      </div>

      {/* Right Section - Today's Interviews */}
      <div className="rounded-xl border bg-card text-card-foreground shadow h-fit sticky top-6 p-6">
        <div className="font-semibold text-md mb-4">Today's Interviews</div>
        <div className="space-y-4">
          {[1, 2].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-1/2 h-8 rounded-lg" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Interviewer:
                </span>
                <Skeleton className="w-1/3 h-5 rounded-lg" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Date:</span>
                <Skeleton className="w-1/2 h-5 rounded-lg" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Skeleton className="w-1/4 h-5 rounded-lg" />
              </div>
              <hr className="my-4" />
            </div>
          ))}
          <div className="text-center text-muted-foreground py-8">
            <Skeleton className="w-full h-5 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LoaderSkeletonCalendar;
