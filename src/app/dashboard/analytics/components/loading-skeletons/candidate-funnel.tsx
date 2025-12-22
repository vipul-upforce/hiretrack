import React from 'react';

function CandidateFunnelSkeleton() {
  return (
    <div className="border rounded-xl p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="p-4 rounded-lg border bg-muted/30 space-y-2">
            <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="h-10 w-full bg-muted animate-pulse rounded" />
      <div className="h-[500px] w-full bg-muted/40 animate-pulse rounded-xl" />
    </div>
  );
}

export default CandidateFunnelSkeleton;
