import { Card, CardContent, CardHeader } from '@/components/ui/card';
import React from 'react';

function JobPerformanceSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <div className="space-y-2">
          <div className="h-5 w-56 rounded bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded bg-muted/70 animate-pulse" />
        </div>

        <div className="flex gap-2 mt-4">
          <div className="h-8 w-20 rounded bg-muted animate-pulse" />
          <div className="h-8 w-20 rounded bg-muted animate-pulse" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-muted/50 border animate-pulse"
            />
          ))}
        </div>

        <div className="h-[450px] w-full rounded bg-muted/40 animate-pulse" />
      </CardContent>
    </Card>
  );
}

export default JobPerformanceSkeleton;
