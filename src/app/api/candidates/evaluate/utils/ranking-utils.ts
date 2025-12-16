import mongoose from 'mongoose';
import { Candidate } from '@/lib/mongodb';
import logger from '@/lib/logger';
import {
  CandidateScores,
  ComparativeRankingResult,
} from '../types';

/**
 * Calculate percentile rank using midpoint method for handling ties
 */
function calculatePercentile(value: number, allValues: number[]): number {
  const sorted = allValues.filter((v) => v != null).sort((a, b) => a - b);

  if (sorted.length <= 1) return 100;

  const countBelow = sorted.filter((v) => v < value).length;
  const countEqual = sorted.filter((v) => v === value).length;

  // Midpoint method
  let adjustedCount = countBelow + (countEqual - 1) * 0.5;

  // Prevent negative percentile baseline
  if (adjustedCount < 0) adjustedCount = 0;

  const percentile = Math.round((adjustedCount / (sorted.length - 1)) * 100);

  // Final safety clamp
  return Math.min(100, Math.max(0, percentile));
}

/**
 * Calculate comparative ranking for a candidate within their job's candidate pool
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param jobId - MongoDB ObjectId of the job
 * @param currentScores - Current evaluation scores for the candidate
 * @returns Comparative ranking data including percentiles and rank
 */
export async function calculateComparativeRanking(
  candidateId: mongoose.Types.ObjectId | string,
  jobId: mongoose.Types.ObjectId | string,
  currentScores: CandidateScores,
): Promise<ComparativeRankingResult> {
  try {
    // Get all candidates for this job with scores
    const candidates = await Candidate?.find({
      jobId,
      scores: { $exists: true },
      isDeleted: { $ne: true },
    }).select('_id scores');

    if (!candidates || candidates.length === 0) {
      return {
        overallRank: 1,
        totalCandidates: 1,
        percentile: 100,
        skillsPercentile: 100,
        experiencePercentile: 100,
        affordabilityPercentile: 100,
        hasTie: false,
        tiedWithCount: 0,
        rankingBasedOn: 'overall' as const,
      };
    }

    const totalCandidates = candidates.length;

    // Determine which score to use for ranking (weighted score if available, otherwise overall)
    const useWeightedScore = currentScores.weightedScore != null;
    const rankingBasedOn: 'overall' | 'weighted' = useWeightedScore
      ? 'weighted'
      : 'overall';
    const currentRankingScore = useWeightedScore
      ? currentScores.weightedScore
      : currentScores.overall;

    const allSkillsScores = candidates
      .map((c) => c.scores?.skills)
      .filter((s) => s != null);
    const allExperienceScores = candidates
      .map((c) => c.scores?.experience)
      .filter((s) => s != null);
    const allAffordabilityScores = candidates
      .map((c) => c.scores?.affordability)
      .filter((s) => s != null);

    // Sort candidates by ranking score (weighted if available, otherwise overall)
    const sortedCandidates = candidates
      .filter((c) => {
        if (useWeightedScore) {
          return c.scores?.weightedScore != null;
        }
        return c.scores?.overall != null;
      })
      .sort((a, b) => {
        const scoreA = useWeightedScore
          ? a.scores?.weightedScore || 0
          : a.scores?.overall || 0;
        const scoreB = useWeightedScore
          ? b.scores?.weightedScore || 0
          : b.scores?.overall || 0;
        return scoreB - scoreA; // Highest first
      });
    const index = sortedCandidates.findIndex(
      (c) => c._id.toString() === candidateId.toString(),
    );

    const currentCandidateRank =
      index === -1 ? sortedCandidates.length : index + 1;

    // Check for ties at the same ranking score
    const candidatesWithSameScore = sortedCandidates.filter((c) => {
      const score = useWeightedScore
        ? c.scores?.weightedScore
        : c.scores?.overall;
      return score === currentRankingScore;
    });
    const hasTie = candidatesWithSameScore.length > 1;
    let tiedWithCount = 0;
    if (hasTie) {
      tiedWithCount = candidatesWithSameScore.length - 1; // Excluding current candidate
    }
    // Get all ranking scores for percentile calculation
    const allRankingScores = sortedCandidates.map((c) => (useWeightedScore ? (c.scores?.weightedScore || 0) : (c.scores?.overall || 0)));

    return {
      overallRank: currentCandidateRank || 1,
      totalCandidates,
      percentile: calculatePercentile(currentRankingScore || 0, allRankingScores),
      skillsPercentile: calculatePercentile(
        currentScores.skills,
        allSkillsScores,
      ),
      experiencePercentile: calculatePercentile(
        currentScores.experience,
        allExperienceScores,
      ),
      affordabilityPercentile: calculatePercentile(
        currentScores.affordability || 0,
        allAffordabilityScores,
      ),
      hasTie,
      tiedWithCount: tiedWithCount || 0,
      rankingBasedOn,
    };
  } catch (error) {
    logger.error({ error }, 'Error calculating comparative ranking');
    return {
      overallRank: 1,
      totalCandidates: 1,
      percentile: 0,
      skillsPercentile: 0,
      experiencePercentile: 0,
      affordabilityPercentile: 0,
      hasTie: false,
      tiedWithCount: 0,
      rankingBasedOn: 'overall' as const,
    };
  }
}

