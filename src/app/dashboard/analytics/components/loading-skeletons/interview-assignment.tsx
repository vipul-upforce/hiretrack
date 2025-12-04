import { Card, CardContent, CardHeader } from '@/components/ui/card';
import React from 'react';

function InterviewAssignmentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-56 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-muted/20 dark:bg-muted/10 p-4 rounded-lg border border-muted/40"
            >
              <div className="h-6 w-10 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-muted/20 dark:bg-muted/10 p-4 rounded-lg border border-muted/40"
            >
              <div className="h-4 w-40 bg-muted rounded animate-pulse mb-3" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-3 w-32 bg-muted rounded animate-pulse mb-2"
                />
              ))}
            </div>
          ))}
        </div>

        <div className="w-full">
          <div className="h-[550px] w-full bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export default InterviewAssignmentSkeleton;
