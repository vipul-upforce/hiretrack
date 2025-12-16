import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  History,
  Settings,
} from '@/lib/mongodb';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ICandidate } from '@/lib/models/candidate';
import { AIEvaluationService } from '@/lib/ai-providers/evaluation-provider';
import { ISettings, IEvaluationConfig } from '@/lib/models/settings';
import { IHistory } from '@/lib/models/history';
import { EvaluationResult } from '@/lib/ai-providers/evaluation-types';
import mongoose from 'mongoose';
import logger from '@/lib/logger';
import { EvaluateCandidateRequest, PopulatedJob } from './types';
import {
  isPopulatedJob,
  extractJobDataForEvaluation,
  extractOrganizationId,
  extractJobIdForHistory,
} from './utils/candidate-utils';
import {
  generateBase64,
  fetchResumeAsBase64,
  normalizeResumeUrl,
} from './utils/resume-utils';
import { calculateComparativeRanking } from './utils/ranking-utils';
import { getDecryptedAIProviders, getActiveProviderApiKey } from './utils/settings-utils';
import { validatePdfPageCount } from './utils/pdf-utils';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'SUCESSSS',
  });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await connectToDatabase();

    if (!Candidate || !Settings) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    const data = await request.json() as EvaluateCandidateRequest;
    if (!data || !data.candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 },
      );
    }

    const { candidateId } = data;
    const candidate = await Candidate.findById(candidateId)
      .select('resume jobId contact scores expectedCTC currentCTC')
      .populate({
        path: 'jobId',
        select:
          'description organizationId title skills salary experience evaluationWeights',
      });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const candidateJobIdForOrg = candidate?.jobId as mongoose.Types.ObjectId | PopulatedJob | undefined;
    const organizationId = extractOrganizationId(candidateJobIdForOrg);

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

    // Get decrypted AI providers with backward compatibility
    const aiProviders = getDecryptedAIProviders(settingsData, organizationId);
    const { activeProvider } = aiProviders;
    const apiKey = getActiveProviderApiKey(aiProviders);

    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not found for active provider: ${activeProvider}` },
        { status: 404 },
      );
    }

    // Process resume URL and convert to base64
    let resumeUrl: string = candidate?.resume?.url || '';
    const origin = request.headers.get('origin') || '';
    resumeUrl = normalizeResumeUrl(resumeUrl, origin);

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
      const normalizedUrl = normalizeResumeUrl(resumeUrl, origin);
      base64Resume = await fetchResumeAsBase64(normalizedUrl);
    }

    // Validate PDF page count if needed
    const evaluationConfig: IEvaluationConfig = settingsData.evaluationConfig || {
      autoEvaluateAllCandidates: false,
      maxPdfPages: 4,
      temperature: 0.1,
      customPrompt: null,
    };

    try {
      await validatePdfPageCount(base64Resume, evaluationConfig);
    } catch (pdfError) {
      if (pdfError instanceof Error) {
        return NextResponse.json(
          { error: pdfError.message },
          { status: 400 },
        );
      }
    }

    // Extract job data for evaluation
    const candidateJobIdForData = candidate?.jobId as mongoose.Types.ObjectId | PopulatedJob | undefined;
    const jobData = extractJobDataForEvaluation(candidateJobIdForData);

    // Create settings object with decrypted aiProviders
    const settingsForEvaluation: Partial<ISettings> = {
      ...settingsData || {},
      aiProviders, // Override with decrypted version
    };

    // Convert candidate to ICandidate format for AIEvaluationService
    const candidateJobIdForEval = candidate?.jobId as mongoose.Types.ObjectId | PopulatedJob | undefined;
    const scores: EvaluationResult = await AIEvaluationService.evaluateResume(
      base64Resume,
      settingsForEvaluation,
      jobData,
      candidate,
    );

    // Calculate weighted score if job has custom weights
    if (isPopulatedJob(candidateJobIdForEval) && candidateJobIdForEval.evaluationWeights) {
      const { evaluationWeights } = candidateJobIdForEval;
      const weightedScore = AIEvaluationService.calculateWeightedScore(
        {
          overall: scores.overall,
          skills: scores.skills,
          experience: scores.experience,
          affordability: scores.affordability || 0,
        },
        evaluationWeights,
      );
      scores.weightedScore = weightedScore;
    }

    // Calculate comparative ranking if enabled
    if (evaluationConfig.enableComparativeRanking) {
      const candidateJobIdForRanking = candidate?.jobId as mongoose.Types.ObjectId | PopulatedJob | undefined;
      let jobIdForRanking: mongoose.Types.ObjectId | string;
      
      if (isPopulatedJob(candidateJobIdForRanking)) {
        const jobIdValue = candidateJobIdForRanking._id;
        jobIdForRanking = typeof jobIdValue === 'string'
          ? jobIdValue
          : jobIdValue;
      } else {
        jobIdForRanking = candidateJobIdForRanking as mongoose.Types.ObjectId | string;
      }

      const comparativeRanking = await calculateComparativeRanking(
        candidate?._id,
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
    console.log('scores in evaluate route', scores);
    // Update candidate scores
    const candidateDocument = await Candidate?.findById(candidate?._id);
    if (!candidateDocument) {
      return NextResponse.json(
        { error: 'Candidate not found for update' },
        { status: 404 },
      );
    }

    candidateDocument.scores = scores;
    await candidateDocument.save();

    // Fetch full candidate with populated fields
    const fullCandidate = (await Candidate?.findById(candidate?._id)
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

    // Fetch and populate candidate history
    const jobIdForHistory = extractJobIdForHistory(fullCandidate.jobId);
    const candidateHistory = await History?.findOne({
      candidateId: candidate?._id,
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

    // Broadcast candidate update
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
  } catch (error) {
    logger.error({ error, url: request?.url }, 'Error evaluating candidate.');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
