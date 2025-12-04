'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function LoaderSkeletonCalendar() {
  return (
    <div className="h-screen flex flex-col overflow-hidden animate-pulse">
      {/* HEADER */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-border/50">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>

          {/* Search + View Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 w-full sm:w-64" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>

            {/* Views */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-14 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Stats */}
        <div className="px-4 sm:px-6 pt-4 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>

        {/* MAIN */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 md:gap-6">
            {/* SIDEBAR */}
            <Card className="min-h-[600px] h-full border border-border/50">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>

            {/* CALENDAR */}
            <Card className="flex flex-col min-h-[500px] border border-border/50 px-5">
              <div className="flex flex-row justify-between my-2 p-3">
                <div className="flex flex-row gap-3">
                  <Skeleton className="w-32 h-10" />
                  <Skeleton className="w-24 h-10" />
                </div>
              </div>
              <Card className="flex flex-col min-h-[500px] border border-border/50">
                <CardContent className="p sm:p-6 flex-1 min-h-0">
                  {/* Calendar Grid Skeleton */}
                  <div className="grid grid-cols-7 gap-2 h-full">
                {[...Array(35)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="border border-border/40 rounded-md p-1 h-24 sm:h-28 flex flex-col gap-1"
                    />
                  ))}
              </div>
                </CardContent>
              </Card>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoaderSkeletonCalendar;
