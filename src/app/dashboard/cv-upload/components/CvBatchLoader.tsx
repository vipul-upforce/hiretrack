"use client";

import { Skeleton } from "@/components/ui/skeleton";

const CvBatchLoader = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" /> {/* Section title */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>

            <div className="flex space-x-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>

            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CvBatchLoader;