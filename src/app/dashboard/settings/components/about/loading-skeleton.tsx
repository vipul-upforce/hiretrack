'use client';

import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';

function AboutVersionLoadingSkeleton() {
  return (
    <div className="px-6 py-4 space-y-6">
      <div className="mb-4 grid w-full h-10 grid-cols-2 self-center rounded-lg bg-muted p-1">
        <div className="flex items-center justify-center rounded-md bg-background shadow-sm">
          <Skeleton className="h-4 w-28" />
        </div>

        

        <div className="flex items-center justify-center rounded-md">
          <Skeleton className="h-4 w-28 opacity-50" />
        </div>
        
      </div>

      <Skeleton className="h-10 w-full" />
      {/* Cron Timezone Section Skeleton */}
      <div className="mx-auto flex w-full items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" /> {/* Icon */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" /> {/* Title */}
            <Skeleton className="h-3 w-48" /> {/* Description */}
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-9 w-[200px]" /> {/* Select Input */}
          <Skeleton className="h-9 w-[70px]" /> {/* Button */}
        </div>
      </div>
      <div className="flex justify-between gap-2  pt-1">
        <Skeleton className="h-8 w-60 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

export default AboutVersionLoadingSkeleton;
