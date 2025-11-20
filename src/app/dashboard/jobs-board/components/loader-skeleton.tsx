"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";

const getRandom = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Generate a random width class like w-32, w-24, w-40 etc
const randomWidth = () => {
  const widths = [
    "w-10",
    "w-16",
    "w-20",
    "w-24",
    "w-28",
    "w-32",
    "w-40",
    "w-48",
    "w-56",
  ];
  return widths[getRandom(0, widths.length - 1)];
};

const LoaderSkeleton = () => {
  const columns = useMemo(() => {
    return [...Array(3)].map(() => {
      return {
        cards: [...Array(getRandom(3, 5))].map(() => ({
          titleWidth: randomWidth(),
          skills: [...Array(getRandom(1, 5))].map(() => randomWidth()),
          customFields: [...Array(getRandom(1, 4))].map(() => randomWidth()),
        })),
      };
    });
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full animate-pulse">
      {/* HEADER */}
      <div className="flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            <CardTitle className="text-xl font-bold">
              <Skeleton className="h-6 w-40" />
            </CardTitle>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-4 w-28" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-md" />
                <Skeleton className="h-8 w-50 rounded-md" />
                <Skeleton className="h-8 w-40 rounded-md" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* FILTER */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-t border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 flex-1"></div>

        <div className="flex gap-1">
          <Skeleton className="h-8 w-10 rounded-md" />
          <Skeleton className="h-8 w-10 rounded-md" />
        </div>
      </div>

      {/* KANBAN */}
      <div className="flex-1 overflow-hidden px-4 pb-4 mt-4">
        <div className="h-full overflow-x-auto overflow-y-hidden">
          <div className="h-full flex gap-1 min-w-full">
            {columns.map((column, colIndex) => (
              <div key={colIndex} className="flex-1 min-w-[300px] px-2">
                <div className="flex flex-col bg-white/70 dark:bg-black/30 rounded-lg p-3 h-full">
                  {/* Column Header */}
                  <div className="py-3 flex-shrink-0 px-2 mb-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                  </div>

                  {/* Job List */}
                  <div className="flex-1 overflow-hidden space-y-3 pr-2 min-w-0">
                    {column.cards.map((card, jobIndex) => (
                      <div
                        key={jobIndex}
                        className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-sm relative w-full"
                      >
                        {/* Title row */}
                        <div className="flex flex-wrap-reverse gap-3 items-center justify-between">
                          <Skeleton className={`h-5 ${card.titleWidth} mb-4`} />

                          <div className="flex flex-row gap-1">
                            <Skeleton className="h-5 w-6 mb-4" />
                            <Skeleton className="h-5 w-6 mb-4" />
                            <Skeleton className="h-5 w-6 mb-4" />
                          </div>
                        </div>

                        <Separator />

                        {/* Candidates */}
                        <div className="flex gap-2 mb-3 mt-4">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>

                        {/* Experience */}
                        <div className="flex gap-2 mb-3">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {card.skills.map((w, i) => (
                            <Skeleton
                              key={i}
                              className={`h-6 ${w} rounded-md`}
                            />
                          ))}
                        </div>

                        {/* Custom Fields */}
                        <div className="space-y-2 mb-4">
                          {card.customFields.map((w, i) => (
                            <Skeleton key={i} className={`h-4 ${w}`} />
                          ))}
                        </div>

                        <Separator />

                        <div className="w-full flex flex-row justify-between">
                          <div className="w-36" />
                          <Skeleton className="h-4 w-32 mt-3" />
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
};

export default LoaderSkeleton;
