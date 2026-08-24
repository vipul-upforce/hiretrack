import { useMemo } from 'react';
import { JobCardSkeleton } from './jobs-card-skeleton';

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 6 }: LoadingSkeletonProps) {
  const skeletons = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        id: `skeleton-${index}`,
      })),
    [count],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {skeletons.map((skeleton) => (
        <JobCardSkeleton key={skeleton.id} />
      ))}
    </div>
  );
}
