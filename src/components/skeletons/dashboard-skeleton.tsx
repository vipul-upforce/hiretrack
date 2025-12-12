/* eslint-disable react/no-array-index-key */
import { CandidateCardSkeleton } from './candidate-card-skelton';
import { InterviewerCardSkeleton } from './interviewer-card-skelton';

export function DashboardSkeleton({ role }) {
  return (
    <div className="h-auto flex flex-col overflow-y-auto w-full animate-pulse">
      {/* HEADER */}
      <div className="flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-muted/50 border animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* CARDS AREA */}
      <div className="flex-1 px-4 mt-6">
        <div className="flex flex-wrap gap-6">
          {role === 'interviewer'
            ? [...Array(8)].map((_, i) => <InterviewerCardSkeleton key={i} />)
            : [...Array(10)].map((_, i) => <CandidateCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
