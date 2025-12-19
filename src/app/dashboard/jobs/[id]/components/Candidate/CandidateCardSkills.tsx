/**
 * Candidate Card Skills Component
 * Displays candidate skills as badges
 */

import { Badge } from '@/components/ui/badge';
import { Candidate } from '@/types/candidate';

interface CandidateCardSkillsProps {
  candidate: Candidate;
}

export function CandidateCardSkills({ candidate }: CandidateCardSkillsProps) {
  if (!candidate.skills || candidate.skills.length === 0) {
    return null;
  }

  return (
    <div className="mb-5">
      <div className="mb-2">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">
          Skills
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {candidate.skills.slice(0, 4).map((skill) => (
          <Badge
            key={`${candidate._id}-skill-${skill}`}
            variant="secondary"
            className="max-w-full truncate border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-900 dark:border-gray-700 dark:bg-black dark:text-gray-100"
            title={skill}
          >
            {skill}
          </Badge>
        ))}
        {candidate.skills.length > 4 && (
          <Badge
            key="more-skills"
            variant="secondary"
            className="flex-shrink-0 border border-gray-300 bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200"
          >
            +{candidate.skills.length - 4} more
          </Badge>
        )}
      </div>
    </div>
  );
}
