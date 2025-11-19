import { JobCardSkeleton } from "./jobs-card-skeleton";

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 6 }: LoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </div>
  );
}
