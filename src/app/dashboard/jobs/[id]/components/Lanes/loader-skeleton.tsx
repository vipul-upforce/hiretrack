import { CandidateCardSkeleton } from '@/components/skeletons/candidate-card-skelton';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

function LoaderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 ">
        <Skeleton className="h-6 w-80" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Separator className="p-0 m-0" />

      <div className="flex flex-row items-center justify-evenly gap-4 px-3 pt-2 mx-auto w-auto">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col max-w-[500px] h-full border-2 gap-8 rounded-lg p-4 mx-auto">
            <div className="flex flex-row justify-between pt-2 px-2">
              <div className="flex flex-row gap-2">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="flex flex-row gap-2 ">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-4" />
              </div>
            </div>
            {[...Array(4)].map((_, i) => <CandidateCardSkeleton key={i} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoaderSkeleton;
