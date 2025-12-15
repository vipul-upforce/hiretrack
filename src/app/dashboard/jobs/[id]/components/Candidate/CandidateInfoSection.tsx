// src/components/candidate/CandidateInfoSection.tsx
import {
  MapPin, Briefcase, Clock, IndianRupee,
} from 'lucide-react';
import { Candidate } from '@/types/candidate';
import { Label } from '@/components/ui/label';

interface CandidateInfoSectionProps {
  candidate: Candidate;
  user: any;
  labelClass: string;
}

export function CandidateInfoSection({
  candidate,
  user,
  labelClass,
}: CandidateInfoSectionProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <MapPin className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="min-w-0 flex items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Location:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {candidate.location}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="min-w-0 flex items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Rel. Exp:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {candidate.relevantExperience}
            y
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="min-w-0 flex items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Exp:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {candidate.experience}
            y
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        <div className="min-w-0 flex items-baseline gap-1">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Notice:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {candidate.noticePeriod}
            d
          </span>
        </div>
      </div>
      {user?.role !== 'interviewer' && (
      <>
        <div className="flex items-center gap-1.5 min-w-0">
          <IndianRupee className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex items-baseline gap-1">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Current:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {candidate.currentCTC}
              L
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <IndianRupee className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex items-baseline gap-1">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Expected:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {candidate.expectedCTC}
              L
            </span>
          </div>
        </div>
      </>
      )}
    </div>
  );
}
