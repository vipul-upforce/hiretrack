import { Suspense } from 'react';
import CandidateSearch from '@/components/forms/candidate-search';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchResultsSkeletonLoader } from '@/components/forms/search-results/skeleton-loader';

export default function Page() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header section with improved design */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 pb-2 dark:border-gray-700">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col gap-y-2 px-0 py-3 md:flex-row md:items-center md:justify-between">
            {/* Title */}
            <CardTitle className="line-clamp-2 text-xl font-bold md:mr-2">
              Candidate Search
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-[300px] w-full" />
              <SearchResultsSkeletonLoader />
            </div>
          }
        >
          <CandidateSearch />
        </Suspense>
      </div>
    </div>
  );
}
