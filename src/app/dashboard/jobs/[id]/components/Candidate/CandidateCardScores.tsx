/**
 * Candidate Card Scores Component
 * Displays evaluation scores in circular format
 */

import { Candidate } from "@/types/candidate";
import { GridCircularScores } from "../Utils/circular-score";

interface CandidateCardScoresProps {
  candidate: Candidate;
}

export function CandidateCardScores({ candidate }: CandidateCardScoresProps) {
  if (!candidate.scores || candidate.scores.overall === undefined) {
    return null;
  }

  return (
    <div className="mb-2 pt-3 border-t border-gray-100 dark:border-gray-800">
      <div className="mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide font-medium truncate">
          Evaluation Scores
        </span>
      </div>
      <GridCircularScores scores={candidate.scores} />
    </div>
  );
}

