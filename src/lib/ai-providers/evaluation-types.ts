/**
 * Types and interfaces for AI evaluation
 */

export interface JobForEvaluate {
  description: string;
  title: string;
  skills: string[];
  salary?: string;
  experience?: number | { min: number; max?: number; inText?: string };
  customFields?: Record<string, unknown>;
}

export interface EvaluationResult {
  overall: number;
  experience: number;
  skills: number;
  education: number;
  projects: number;
  contact: string;
  certifications: number;
  affordability?: number;
  strengths: string[];
  areas_for_improvement: string[];
  recommendation: string;
  notes: string;
  failure?: string;
  // New enhanced evaluation fields
  confidenceScores?: {
    overall: number;
    skills: number;
    experience: number;
    affordability: number;
  };
  evidenceLinks?: {
    overall: string;
    skills: string;
    experience: string;
    affordability: string;
  };
  redFlags?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string;
  }>;

  skillsMatrix?: {
    requiredAndPresent: Array<{
      skill: string;
      yearsOfExperience?: number;
      proficiencyLevel?: string;
      evidence: string;
    }>;
    requiredButMissing: string[];
    presentButNotRequired: string[];
  };
  // Fields calculated after AI evaluation
  weightedScore?: number;
  comparativeRanking?: {
    overallRank: number;
    totalCandidates: number;
    percentile: number;
    skillsPercentile: number;
    experiencePercentile: number;
    affordabilityPercentile: number;
    hasTie: boolean;
    tiedWithCount: number;
    rankingBasedOn: 'overall' | 'weighted';
  };
}

/**
 * Score object that AI might return instead of plain number
 */
export interface ScoreObject {
  score: number;
  justification?: string;
}

/**
 * Parsed evaluation object with flexible score types
 */
export type ParsedEvaluationObject = Partial<EvaluationResult> & {
  redFlags?: Array<{
    type: string;
    severity?: string;
    description: string;
    evidence: string;
  }>;
  salary?: number | ScoreObject;
  overall?: number | ScoreObject;
  experience?: number | ScoreObject;
  skills?: number | ScoreObject;
  affordability?: number | ScoreObject;
  education?: number | ScoreObject;
  projects?: number | ScoreObject;
  certifications?: number | ScoreObject;
};
