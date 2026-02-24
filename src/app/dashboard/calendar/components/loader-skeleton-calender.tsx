/* eslint-disable react/no-array-index-key */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function LoaderSkeletonCalendar() {
  return (
    <div className="flex h-screen animate-pulse flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-border/50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="mb-1 h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>

          {/* Search + View Switch */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex w-full gap-2 sm:w-auto">
              <Skeleton className="h-10 w-full sm:w-64" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>

            {/* Views */}
            <div className="flex gap-1 rounded-lg border p-1">
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-14 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="px-4 pb-6 pt-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>

        {/* MAIN */}
        <div className="px-4 pb-6 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
            {/* SIDEBAR */}
            <Card className="h-full min-h-[600px] border border-border/50">
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-6 w-32" />
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>

            {/* CALENDAR */}
            <Card className="flex min-h-[500px] flex-col border border-border/50 px-5">
              <div className="my-2 flex flex-row justify-between p-3">
                <div className="flex flex-row gap-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
              <Card className="flex min-h-[500px] flex-col border border-border/50">
                <CardContent className="p min-h-0 flex-1 sm:p-6">
                  {/* Calendar Grid Skeleton */}
                  <div className="grid h-full grid-cols-7 gap-2">
                    {[...Array(35)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="flex h-24 flex-col gap-1 rounded-md border border-border/40 p-1 sm:h-28"
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
