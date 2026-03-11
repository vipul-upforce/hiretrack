/* eslint-disable react/no-array-index-key */
import { CandidateCardSkeleton } from './candidate-card-skelton';
import { InterviewerCardSkeleton } from './interviewer-card-skelton';

export function DashboardSkeleton({ role }: { role: string | null }) {
  return (
    <div className="flex h-auto w-full animate-pulse flex-col overflow-y-auto">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-4 dark:border-gray-700">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border bg-muted/50"
            />
          ))}
        </div>
      </div>

      {/* CARDS AREA */}
      <div className="mt-6 flex-1 px-4">
        <div className="flex flex-wrap gap-6">
          {role === 'interviewer'
            ? [...Array(8)].map((_, i) => <InterviewerCardSkeleton key={i} />)
            : [...Array(10)].map((_, i) => <CandidateCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
