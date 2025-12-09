import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  History,
  Job,
  Settings,
} from '@/lib/mongodb';
import { promises as fs } from 'fs';
import path from 'path';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ICandidate } from '@/lib/models/candidate';
import { AIEvaluationService } from '@/lib/ai-providers/evaluation-provider';
import { decryptProviderKeys } from '@/lib/encryption';
import { ISettings, IAIProviders, IEvaluationConfig } from '@/lib/models/settings';
import { IJob } from '@/lib/models/job';
import { IHistory } from '@/lib/models/history';
import { EvaluationResult } from '@/lib/ai-providers/evaluation-types';
import mongoose from 'mongoose';

/**
 * Request body type for PUT /api/candidates/evaluate
 */
interface EvaluateCandidateRequest {
  candidateId: string;
}

/**
 * Type for candidate scores used in comparative ranking
 */
interface CandidateScores {
  overall: number;
  skills: number;
  experience: number;
  affordability?: number;
  weightedScore?: number;
}

/**
 * Return type for comparative ranking calculation
 */
interface ComparativeRankingResult {
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
type PopulatedJob = {
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
type CandidateWithJob = Omit<ICandidate, 'jobId'> & {
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
interface JobDataForEvaluation {
  description: string;
  salary?: string;
  title: string;
  skills: string[];
  experience?: number;
}

/**
 * Type guard to check if jobId is populated object
 */
function isPopulatedJob(
  jobId: mongoose.Types.ObjectId | PopulatedJob
): jobId is PopulatedJob {
  return typeof jobId === 'object' && jobId !== null && 'description' in jobId;
}

/**
 * Generates base64 encoded string from a local file path
 * @param url - URL containing file path (format: ...files?pathName=...)
 * @returns Base64 encoded file content or empty string if path not found
 */
const generateBase64 = async (url: string): Promise<string> => {
  const pathName = url.split('files?pathName=')[1];
  if (!pathName) {
    return '';
  }
  const safePath = path.normalize(pathName);
  const filePath = safePath;
  const fileBuffer = await fs.readFile(filePath);
  const base64Resume = fileBuffer.toString('base64');
  return base64Resume;
};

/**
 * Calculate comparative ranking for a candidate within their job's candidate pool
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param jobId - MongoDB ObjectId of the job
 * @param currentScores - Current evaluation scores for the candidate
 * @returns Comparative ranking data including percentiles and rank
 */
async function calculateComparativeRanking(
  candidateId: mongoose.Types.ObjectId | string,
  jobId: mongoose.Types.ObjectId | string,
  currentScores: CandidateScores,
): Promise<ComparativeRankingResult> {
  try {
    // Get all candidates for this job with scores
    const candidates = await Candidate.find({
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
    const rankingBasedOn: 'overall' | 'weighted' = useWeightedScore ? 'weighted' : 'overall';
    const currentRankingScore = useWeightedScore ? currentScores.weightedScore : currentScores.overall;

    /**
     * Calculate percentile rank using midpoint method for handling ties
     * @param value - The score value to calculate percentile for
     * @param allValues - Array of all score values in the distribution
     * @returns Percentile rank (0-100)
     */
    const calculatePercentile = (value: number, allValues: number[]): number => {
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
    };
    
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
        const scoreA = useWeightedScore ? (a.scores?.weightedScore || 0) : (a.scores?.overall || 0);
        const scoreB = useWeightedScore ? (b.scores?.weightedScore || 0) : (b.scores?.overall || 0);
        return scoreB - scoreA; // Highest first
      });
    const index = sortedCandidates.findIndex(
      (c) => c._id.toString() === candidateId.toString(),
    );

    const currentCandidateRank = index === -1 ? sortedCandidates.length : index + 1;

    // Check for ties at the same ranking score
    const candidatesWithSameScore = sortedCandidates.filter((c) => {
      const score = useWeightedScore ? c.scores?.weightedScore : c.scores?.overall;
      return score === currentRankingScore;
    });
    const hasTie = candidatesWithSameScore.length > 1;
    let tiedWithCount = 0;
    if(hasTie){
      tiedWithCount = candidatesWithSameScore.length - 1; // Excluding current candidate
    }
    // Get all ranking scores for percentile calculation
    const allRankingScores = sortedCandidates.map((c) => (useWeightedScore ? (c.scores?.weightedScore || 0) : (c.scores?.overall || 0)));

    return {
      overallRank: currentCandidateRank || 1,
      totalCandidates,
      percentile: calculatePercentile(currentRankingScore, allRankingScores),
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
    console.error('Error calculating comparative ranking:', error);
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

// This function is now replaced by AIEvaluationService
// Kept for backward compatibility if needed

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "SUCESSSS",
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();

    if (!Candidate || !Settings) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const data = await request.json() as EvaluateCandidateRequest;
    if (!data || !data.candidateId) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    const { candidateId } = data;
    const candidate = await Candidate.findById(candidateId)
      .select("resume jobId contact scores expectedCTC currentCTC")
      .populate({
        path: "jobId",
        select: "description organizationId title skills salary experience evaluationWeights",
      })
      .lean() as unknown as CandidateWithJob | null;
    
    console.log(candidate, "candidate in resume evaluation api");

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const organizationId = isPopulatedJob(candidate.jobId)
      ? String(candidate.jobId.organizationId)
      : '';

    console.log('Looking for settings with organizationId:', organizationId);

    const settingsData = await Settings.findOne({
      organizationId,
    })
      .select('aiProviders evaluationConfig fileStorage gemini timeZone')
      .lean()
      .exec() as Pick<ISettings, 'aiProviders' | 'evaluationConfig' | 'fileStorage' | 'gemini' | 'timeZone'> | null;

    if (!settingsData) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 },
      );
    }

    // Check if AI providers are configured with backward compatibility
    let aiProviders: IAIProviders = settingsData.aiProviders || {
      activeProvider: 'gemini',
      gemini: {
        api_key: '',
        model: 'gemini-1.5-flash',
        customModel: '',
      },
      openai: {
        api_key: '',
        model: 'gpt-4o-mini',
        customModel: '',
      },
      anthropic: {
        api_key: '',
        model: 'claude-3-5-sonnet-20241022',
        customModel: '',
      },
      perplexity: {
        api_key: '',
        model: 'sonar-pro',
        customModel: '',
      },
    };

    // Handle backward compatibility for legacy Gemini-only installations
    if (!settingsData.aiProviders && settingsData.gemini?.gemini_key) {
      const legacyGeminiKey = settingsData.gemini.gemini_key;

      aiProviders = {
        activeProvider: 'gemini',
        gemini: {
          api_key: legacyGeminiKey,
          model: 'gemini-1.5-flash',
          customModel: '',
        },
        openai: {
          api_key: '',
          model: 'gpt-4o-mini',
          customModel: '',
        },
        anthropic: {
          api_key: '',
          model: 'claude-3-5-sonnet-20241022',
          customModel: '',
        },
        perplexity: {
          api_key: '',
          model: 'sonar-pro',
          customModel: '',
        },
      };

      console.log('Using backward compatibility for legacy Gemini settings');
    }

    // Decrypt API keys from database
    aiProviders = decryptProviderKeys(aiProviders, organizationId) as IAIProviders;

    const { activeProvider } = aiProviders;
    const apiKey = aiProviders[activeProvider]?.api_key;

    // Debug logging
    console.log(
      'AI Providers from settings:',
      JSON.stringify(
        {
          activeProvider: aiProviders.activeProvider,
          hasGeminiKey: !!aiProviders.gemini?.api_key,
          hasOpenAIKey: !!aiProviders.openai?.api_key,
          hasAnthropicKey: !!aiProviders.anthropic?.api_key,
          hasPerplexityKey: !!aiProviders.perplexity?.api_key,
          anthropicObject: aiProviders.anthropic,
        },
        null,
        2,
      ),
    );

    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not found for active provider: ${activeProvider}` },
        { status: 404 },
      );
    }

    let resumeUrl: string = candidate.resume.url;
    if (!resumeUrl.startsWith('http')) {
      const origin = request.headers.get('origin') || '';
      resumeUrl = `${origin}${resumeUrl}`.trim();
    }
    console.log('📌📌RESUME URL : ', resumeUrl);
    if (!resumeUrl) {
      return NextResponse.json(
        { error: 'Resume URL not found' },
        { status: 400 },
      );
    }

    let base64Resume: string;
    const fileStorage = settingsData.fileStorage?.storageType || 'local';
    if (fileStorage === 'local') {
      base64Resume = await generateBase64(resumeUrl);
    } else {
      if (!resumeUrl.startsWith('http')) {
        const origin = request.headers.get('origin') || '';
        console.log('reqHeader: ', origin);
        resumeUrl = origin + resumeUrl;
      }
      const response = await fetch(resumeUrl.trim());
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch resume file' },
          { status: 500 },
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const resumeBuffer = Buffer.from(arrayBuffer);
      base64Resume = resumeBuffer.toString('base64');
    }

    // Check PDF page count if autoEvaluateAllCandidates is false
    const evaluationConfig: IEvaluationConfig = settingsData.evaluationConfig || {
      autoEvaluateAllCandidates: false,
      maxPdfPages: 4,
      temperature: 0.1,
      customPrompt: null,
    };

    if (!evaluationConfig.autoEvaluateAllCandidates) {
      // Check page count
      try {
        const pdfBuffer = Buffer.from(base64Resume, 'base64');
        const uint8Array = new Uint8Array(pdfBuffer);

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
        const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

        const pageCount = pdf.numPages;

        if (
          evaluationConfig.maxPdfPages > 0
        && pageCount > evaluationConfig.maxPdfPages
        ) {
          return NextResponse.json(
            {
              error: `Resume has ${pageCount} pages. Auto-evaluation is limited to ${evaluationConfig.maxPdfPages} pages. Please evaluate manually or update settings.`,
            },
            { status: 400 },
          );
        }
      } catch (pdfError) {
        console.warn('PDF page count check failed:', pdfError);
      }
    }

    // Extract job data with proper type checking
    const jobDescription = isPopulatedJob(candidate.jobId)
      ? String(candidate.jobId.description)
      : '';
    
    const jobData: JobDataForEvaluation = {
      description: jobDescription,
      salary: isPopulatedJob(candidate.jobId) && candidate.jobId.salary?.inText
        ? candidate.jobId.salary.inText
        : undefined,
      title: isPopulatedJob(candidate.jobId)
        ? String(candidate.jobId.title)
        : '',
      skills: isPopulatedJob(candidate.jobId)
        ? candidate.jobId.skills
        : [],
      experience: isPopulatedJob(candidate.jobId)
        ? candidate.jobId.experience
        : undefined,
    };
    // Log what we're passing to the evaluation service
    console.log(
      'Passing to AIEvaluationService:',
      JSON.stringify(
        {
          hasAiProviders: !!aiProviders,
          activeProvider: aiProviders.activeProvider,
          geminiKeyLength: aiProviders.gemini?.api_key?.length,
        },
        null,
        2,
      ),
    );

    // Create settings object with decrypted aiProviders
    const settingsForEvaluation: Partial<ISettings> = {
      ...settingsData,
      aiProviders, // Override with decrypted version
    };

    // Pass the settings with decrypted aiProviders
    // Convert candidate to ICandidate format for AIEvaluationService
    const candidateForEvaluation: ICandidate = {
      ...candidate,
      jobId: isPopulatedJob(candidate.jobId)
        ? { _id: String(candidate.jobId._id), title: candidate.jobId.title, description: candidate.jobId.description }
        : candidate.jobId,
    } as ICandidate;

    const scores: EvaluationResult = await AIEvaluationService.evaluateResume(
      base64Resume,
      settingsForEvaluation,
      jobData,
      candidateForEvaluation,
    );
    console.log('scores in evaluate route', scores);
    console.log('scores.skillsMatrix.requiredAndPresent in evaluate route', scores.skillsMatrix?.requiredAndPresent);
    
    // Calculate weighted score if job has custom weights
    if (isPopulatedJob(candidate.jobId) && candidate.jobId.evaluationWeights) {
      const evaluationWeights = candidate.jobId.evaluationWeights;
      const weightedScore = AIEvaluationService.calculateWeightedScore(
        {
          overall: scores.overall,
          skills: scores.skills,
          experience: scores.experience,
          affordability: scores.affordability || 0,
        },
        evaluationWeights,
      );
      console.log('weightedScore in evaluate route', weightedScore);
      scores.weightedScore = weightedScore;
    }

    // Calculate comparative ranking if enabled
    if (evaluationConfig.enableComparativeRanking) {
      // Convert jobId to string or ObjectId for calculateComparativeRanking
      let jobIdForRanking: mongoose.Types.ObjectId | string;
      if (isPopulatedJob(candidate.jobId)) {
        const jobIdValue = candidate.jobId._id;
        jobIdForRanking = typeof jobIdValue === 'string'
          ? jobIdValue
          : jobIdValue;
      } else {
        jobIdForRanking = candidate.jobId;
      }
      
      const comparativeRanking = await calculateComparativeRanking(
        candidate._id,
        jobIdForRanking,
        {
          overall: scores.overall,
          skills: scores.skills,
          experience: scores.experience,
          affordability: scores.affordability,
          weightedScore: scores.weightedScore,
        },
      );
      scores.comparativeRanking = comparativeRanking;
    }

    // Update candidate scores - need to fetch document again since we used .lean()
    const candidateDocument = await Candidate.findById(candidate._id);
    if (!candidateDocument) {
      return NextResponse.json(
        { error: 'Candidate not found for update' },
        { status: 404 },
      );
    }

    candidateDocument.scores = scores;
    await candidateDocument.save();

    const fullCandidate = (await Candidate.findById(candidate._id)
      .populate([
        {
          path: 'assignment.interviewerId',
          select: '_id name email',
        },
        {
          path: 'remarks.userId',
          select: '_id name email',
        },
        {
          path: 'jobId',
          select: '_id description title',
        },
      ])
      .lean()) as ICandidate | null;

    if (!fullCandidate) {
      return NextResponse.json(
        { error: 'Failed to fetch updated candidate' },
        { status: 500 },
      );
    }

    // Extract jobId for history query - handle both ObjectId and populated object
    let jobIdForHistory: mongoose.Types.ObjectId | string | undefined;
    const candidateJobId = fullCandidate.jobId;
    
    if (candidateJobId && typeof candidateJobId === 'object' && '_id' in candidateJobId) {
      const jobIdValue = candidateJobId._id;
      jobIdForHistory = typeof jobIdValue === 'string'
        ? jobIdValue
        : String(jobIdValue);
    } else if (candidateJobId) {
      jobIdForHistory = typeof candidateJobId === 'string'
        ? candidateJobId
        : String(candidateJobId);
    }

    const candidateHistory = await History?.findOne({
      candidateId: candidate._id,
      jobId: jobIdForHistory,
    });

    const candidateHistoryPopulated = candidateHistory
      ? await candidateHistory.populate([
          { path: 'history.assignmentBy', select: '_id name email' },
          { path: 'history.currentInterviewer', select: '_id name email' },
          { path: 'history.previousInterviewer', select: '_id name email' },
          { path: 'history.note.userId', select: '_id name email' },
        ])
      : null;

    // Debug: Check what's being broadcast
    const dataTobroadcast: ICandidate & { history?: IHistory['history'] } = {
      ...fullCandidate,
      history: candidateHistoryPopulated?.history,
    };

    broadcastCandidateUpdate(dataTobroadcast);

    return NextResponse.json(
      {
        message: 'Candidate scores updated successfully',
        candidate: scores,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.log('Upper: ', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log(error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
