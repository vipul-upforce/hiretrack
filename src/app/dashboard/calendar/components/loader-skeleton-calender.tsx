import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

const LoaderSkeletonCalendar = () => (
  <div className="h-screen flex flex-col overflow-hidden">
    {/* Header */}
    <div className="flex-shrink-0 px-6 py-4 border-b border-border/50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Skeleton className="w-64 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
          <Skeleton className="w-64 h-10 rounded-lg" />
        </div>
      </div>
    </div>

    {/* Stats Cards */}
    <div className="flex-shrink-0 px-6 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 min-h-0 px-6 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 h-full">
        {/* Left Sidebar Skeleton */}
        <aside className="space-y-2.5">
          {/* Today's Schedule */}
          <div className="rounded-xl border bg-card">
            <div className="p-3 pb-2">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="p-3 pt-0">
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-2 border rounded-md space-y-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl border bg-card">
            <div className="p-3 pb-2">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="p-3 pt-0">
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-2 border rounded-md space-y-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="border-t pt-1 mt-1">
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Not Scheduled */}
          <div className="rounded-xl border bg-card">
            <div className="p-3 pb-2">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="p-3 pt-0">
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-2 border rounded-md space-y-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="rounded-xl border bg-card">
            <div className="p-3 pb-2">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="p-3 pt-0">
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </aside>

        {/* Calendar Skeleton */}
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export default LoaderSkeletonCalendar;
