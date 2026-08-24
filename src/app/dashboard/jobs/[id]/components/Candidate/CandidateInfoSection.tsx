// src/components/candidate/CandidateInfoSection.tsx
import { MapPin, Briefcase, Clock, IndianRupee } from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { User } from '../../schemas/AssignCandidateSchema';

interface CandidateInfoSectionProps {
  candidate: Candidate;
  user: User | null;
}

export function CandidateInfoSection({
  candidate,
  user,
}: CandidateInfoSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Location:
          </span>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {candidate.location}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Rel. Exp:
          </span>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {candidate.relevantExperience}y
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Total Exp:
          </span>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {candidate.experience}y
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Notice:
          </span>
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {candidate.noticePeriod}d
          </span>
        </div>
      </div>
      {user?.role !== 'interviewer' && (
        <>
          <div className="flex min-w-0 items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Current:
              </span>
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {candidate.currentCTC}L
              </span>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Expected:
              </span>
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {candidate.expectedCTC}L
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
