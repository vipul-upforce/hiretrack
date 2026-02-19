'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface JobCardLoadingSkeletonProps {
  titleWidth?: string;
  skillWidths?: string[];
  customFieldWidths?: string[];
}

const DEFAULT_SKILL_WIDTHS = ['w-20', 'w-24', 'w-16'];
const DEFAULT_CUSTOM_FIELD_WIDTHS = ['w-24', 'w-32'];

export function JobCardLoadingSkeleton({
  titleWidth = 'w-40',
  skillWidths = DEFAULT_SKILL_WIDTHS,
  customFieldWidths = DEFAULT_CUSTOM_FIELD_WIDTHS,
}: JobCardLoadingSkeletonProps) {
  const skillWidthCounts = new Map<string, number>();
  const customFieldWidthCounts = new Map<string, number>();

  return (
    <div className="relative w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-black">
      <div className="flex flex-wrap-reverse items-center justify-between gap-3">
        <Skeleton className={`mb-4 h-5 ${titleWidth}`} />

        <div className="flex flex-row gap-1">
          <Skeleton className="mb-4 h-5 w-6" />
          <Skeleton className="mb-4 h-5 w-6" />
          <Skeleton className="mb-4 h-5 w-6" />
        </div>
      </div>

      <Separator />

      <div className="mb-3 mt-4 flex gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="mb-3 flex gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {skillWidths.map((w) => {
          const count = (skillWidthCounts.get(w) || 0) + 1;
          skillWidthCounts.set(w, count);
          return (
            <Skeleton
              key={`skill-${w}-${count}`}
              className={`h-6 ${w} rounded-md`}
            />
          );
        })}
      </div>

      <div className="mb-4 space-y-2">
        {customFieldWidths.map((w) => {
          const count = (customFieldWidthCounts.get(w) || 0) + 1;
          customFieldWidthCounts.set(w, count);
          return <Skeleton key={`field-${w}-${count}`} className={`h-4 ${w}`} />;
        })}
      </div>

      <Separator />

      <div className="flex w-full flex-row justify-between">
        <div className="w-36" />
        <Skeleton className="mt-3 h-4 w-32" />
      </div>
    </div>
  );
}
