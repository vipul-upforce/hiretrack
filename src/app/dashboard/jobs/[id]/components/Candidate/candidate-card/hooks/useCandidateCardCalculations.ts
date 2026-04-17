import { useMemo } from 'react';
import { Candidate } from '@/types/candidate';

export function getCandidateCardCalculations(localCandidate: Candidate) {
  if (!localCandidate.scores) {
    return { averageScore: 0, showStar: false, showRedFlag: false };
  }

  const scores = [
    localCandidate.scores.overall,
    localCandidate.scores.experience,
    localCandidate.scores.skills,
    localCandidate.scores.affordability,
  ].filter((score) => score !== undefined && score >= 0);

  if (scores.length === 0) {
    return { averageScore: 0, showStar: false, showRedFlag: false };
  }

  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return {
    averageScore: avg,
    showStar: avg > 7,
    showRedFlag: avg < 4,
  };
}

/**
 * Calculates memoized score-related values for the candidate card
 * @param localCandidate - Candidate data with scores
 * @returns Object containing averageScore, showStar, and showRedFlag
 */
export function useCandidateCardCalculations(localCandidate: Candidate) {
  const { averageScore, showStar, showRedFlag } = useMemo(() => {
    return getCandidateCardCalculations(localCandidate);
  }, [localCandidate.scores]);

  return {
    averageScore,
    showStar,
    showRedFlag,
  };
}

