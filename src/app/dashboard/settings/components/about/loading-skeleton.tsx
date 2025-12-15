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

      <Skeleton className="h-12 w-full" />
      <div className="flex justify-between gap-2  pt-1">
        <Skeleton className="h-8 w-60 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
    </div>
  );
}

export default AboutVersionLoadingSkeleton;
