import mongoose from 'mongoose';
import { ICandidate } from '@/lib/models/candidate';

/**
 * Request body type for PUT /api/candidates/evaluate
 */
export interface EvaluateCandidateRequest {
  candidateId: string;
}

/**
 * Type for candidate scores used in comparative ranking
 */
export interface CandidateScores {
  overall: number;
  skills: number;
  experience: number;
  affordability?: number;
  weightedScore?: number;
}

/**
 * Return type for comparative ranking calculation
 */
export interface ComparativeRankingResult {
  overallRank: number;
  totalCandidates: number;
  percentile: number;
  skillsPercentile: number;
  experiencePercentile: number;
  affordabilityPercentile: number;
  hasTie: boolean;
  tiedWithCount: number;
  rankingBasedOn: 'overall' | 'weighted';
}

/**
 * Type for populated job with minimal fields
 */
export type PopulatedJob = {
  _id: mongoose.Types.ObjectId | string;
  description: string;
  organizationId?: mongoose.Types.ObjectId | string;
  title: string;
  skills?: string[];
  experience?: number;
  salary?: {
    min: number;
    max: number;
    inText: string;
    isPrivate: boolean;
  };
  evaluationWeights?: {
    skills: number;
    experience: number;
    affordability: number;
    overall: number;
  };
};

/**
 * Type for candidate document with populated jobId
 */
export type CandidateWithJob = Omit<ICandidate, 'jobId'> & {
  jobId: mongoose.Types.ObjectId | PopulatedJob;
  _id: mongoose.Types.ObjectId;
  resume: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  contact: string;
  scores?: ICandidate['scores'];
  expectedCTC?: number;
  currentCTC?: number;
};

/**
 * Type for job data extracted from candidate
 */
export interface JobDataForEvaluation {
  description: string;
  salary?: string;
  title: string;
  skills: string[];
  experience?: number;
}

