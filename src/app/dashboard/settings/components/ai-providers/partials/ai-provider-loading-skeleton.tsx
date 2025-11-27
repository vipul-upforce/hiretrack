import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const AiProviderSkeleton = () => {
  return (
    <div className="flex flex-col h-[calc(86vh-80px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 sticky top-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border rounded-xl p-6 space-y-5 min-h-[300px]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>

              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>

        <div className="border rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-52" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-64" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4 sticky bottom-0">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
};

export default AiProviderSkeleton;
