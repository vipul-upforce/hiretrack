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
        <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-medium truncate">
          Skills
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {candidate.skills.slice(0, 4).map((skill, index) => (
          <Badge
            key={`${candidate._id}-skill-${index}-${skill}`}
            variant="secondary"
            className="text-xs px-2.5 py-1 bg-gray-100 text-gray-900 border border-gray-200 dark:bg-black dark:text-gray-100 dark:border-gray-700 font-medium truncate max-w-full"
            title={skill}
          >
            {skill}
          </Badge>
        ))}
        {candidate.skills.length > 4 && (
          <Badge
            key="more-skills"
            variant="secondary"
            className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 font-medium flex-shrink-0"
          >
            +
            {candidate.skills.length - 4}
            {' '}
            more
          </Badge>
        )}
      </div>
    </div>
  );
}
