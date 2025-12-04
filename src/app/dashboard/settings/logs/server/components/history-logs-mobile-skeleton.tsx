import { Skeleton } from '@mui/material';
import React from 'react';

function MobileSkeletonHistroyLogs() {
  return (
    <div className="md:hidden p-3 space-y-3">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={`mskel-${idx}`} className="rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MobileSkeletonHistroyLogs;
