import { CandidateCardSkeleton } from '@/components/skeletons/candidate-card-skelton';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function LoaderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Skeleton className="h-6 w-80" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Separator className="m-0 p-0" />

      <div className="mx-auto flex w-auto flex-row items-center justify-evenly gap-4 px-3 pt-2">
        {[...Array(8)].map(() => (
          <div
            key={Math.random()}
            className="mx-auto flex h-full max-w-[500px] flex-col gap-8 rounded-lg border-2 p-4"
          >
            <div className="flex flex-row justify-between px-2 pt-2">
              <div className="flex flex-row gap-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex flex-row gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-4" />
              </div>
            </div>
            {[...Array(4)].map(() => (
              <CandidateCardSkeleton key={Math.random()} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoaderSkeleton;
