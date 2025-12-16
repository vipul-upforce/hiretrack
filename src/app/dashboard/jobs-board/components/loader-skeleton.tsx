'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useMemo } from 'react';
import { getRandom } from '@/lib/utils/getRandom';

// Generate a random width class like w-32, w-24, w-40 etc
const randomWidth = () => {
  const widths = [
    'w-10',
    'w-16',
    'w-20',
    'w-24',
    'w-28',
    'w-32',
    'w-40',
    'w-48',
    'w-56',
  ];
  return widths[getRandom(0, widths.length - 1)];
};

function LoaderSkeleton() {
  const columns = useMemo(
    () =>
      [...Array(3)].map(() => ({
        cards: [...Array(getRandom(3, 5))].map(() => ({
          titleWidth: randomWidth(),
          skills: [...Array(getRandom(1, 5))].map(() => randomWidth()),
          customFields: [...Array(getRandom(1, 4))].map(() => randomWidth()),
        })),
      })),
    [],
  );

  return (
    <div className="flex h-screen w-full animate-pulse flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-xl font-bold">
              <Skeleton className="h-6 w-40" />
            </CardTitle>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-md" />
                <Skeleton className="w-50 h-8 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-md" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* FILTER */}
      <div className="flex items-center gap-3 border-b border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-black">
        <div className="flex flex-1 items-center gap-3" />

        <div className="flex gap-1">
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="h-8 w-10 rounded-md" />
        </div>
      </div>

      {/* KANBAN */}
      <div className="mt-4 flex-1 overflow-hidden px-4 pb-4">
        <div className="h-full overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-w-full gap-1">
            {columns.map((column, _) => (
              <div
                key={getRandom(0, 1000000).toString()}
                className="min-w-[300px] flex-1 px-2"
              >
                <div className="flex h-full flex-col rounded-lg bg-white/70 p-3 dark:bg-black/30">
                  {/* Column Header */}
                  <div className="mb-4 flex-shrink-0 px-2 py-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                  </div>

                  {/* Job List */}
                  <div className="min-w-0 flex-1 space-y-3 overflow-hidden pr-2">
                    {column.cards.map((card) => (
                      <div
                        key={getRandom(0, 1000000).toString()}
                        className="relative w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-black"
                      >
                        {/* Title row */}
                        <div className="flex flex-wrap-reverse items-center justify-between gap-3">
                          <Skeleton className={`h-5 ${card.titleWidth} mb-4`} />

                          <div className="flex flex-row gap-1">
                            <Skeleton className="mb-4 h-5 w-6" />
                            <Skeleton className="mb-4 h-5 w-6" />
                            <Skeleton className="mb-4 h-5 w-6" />
                          </div>
                        </div>

                        <Separator />

                        {/* Candidates */}
                        <div className="mb-3 mt-4 flex gap-2">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>

                        {/* Experience */}
                        <div className="mb-3 flex gap-2">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>

                        {/* Skills */}
                        <div className="mb-3 flex flex-wrap gap-2">
                          {card.skills.map((w) => (
                            <Skeleton
                              key={getRandom(0, 1000000).toString()}
                              className={`h-6 ${w} rounded-md`}
                            />
                          ))}
                        </div>

                        {/* Custom Fields */}
                        <div className="mb-4 space-y-2">
                          {card.customFields.map((w) => (
                            <Skeleton
                              key={getRandom(0, 1000000).toString()}
                              className={`h-4 ${w}`}
                            />
                          ))}
                        </div>

                        <Separator />

                        <div className="flex w-full flex-row justify-between">
                          <div className="w-36" />
                          <Skeleton className="mt-3 h-4 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoaderSkeleton;
