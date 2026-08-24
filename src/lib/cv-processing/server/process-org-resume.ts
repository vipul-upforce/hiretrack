import { AIProviderFactory } from '@/lib/ai-providers';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import { Candidate } from '@/lib/mongodb';
import {
  batchItemFieldsFromBulkAttempts,
  type CvParseUsageMetadata,
} from '../cv-parse-usage';
import {
  buildBulkProviderAttemptOrder,
  extractBulkCvResumeFromPdfFile,
  pdfFileFromBase64,
} from './bulk-resume-extract';
import type { OrgCvParseContext } from './cv-parse-routing';
import {
  CvResumeProcessError,
  isCvResumeProcessError,
} from './cv-resume-process-error';
import { ensureParsedResumeForPersistence } from '@/lib/cv-upload/normalize-parsed-resume';
import { resolveStoredCandidateStatusName } from '@/lib/cv-upload/operations';

export interface ProcessOrgResumeInput {
  base64Resume: string;
  organizationId: string;
  /** Used for bulk round-robin seeding; defaults to `resume.pdf`. */
  filename?: string;
}

export interface ExtendedOrgResumeData extends ProcessedResumeData {
  organizationId: string;
  /** Default lane name for new candidates (metadata only — persisted as Lane ObjectId). */
  status: string;
  isDeleted: boolean;
  error?: string;
  isDuplicate?: boolean;
  duplicateCandidateId?: string;
  duplicateReason?: string;
}

export interface ProcessOrgResumeResult {
  data: ExtendedOrgResumeData;
  usage: CvParseUsageMetadata;
}

async function finalizeParsedResume(
  parsedData: ProcessedResumeData,
  organizationId: string,
  filename: string,
): Promise<ExtendedOrgResumeData> {
  if (parsedData.error) {
    return {
      ...parsedData,
      organizationId,
      status: 'rejected',
      isDeleted: false,
    };
  }

  const normalized = ensureParsedResumeForPersistence(parsedData, { filename });

  const existingCandidate = await Candidate?.findOne({
    name: normalized.name,
    email: normalized.email,
    organizationId,
    isDeleted: false,
  })
    .populate({ path: 'status', select: 'name' })
    .lean();

  if (existingCandidate) {
    return {
      ...normalized,
      organizationId,
      status: resolveStoredCandidateStatusName(existingCandidate.status),
      isDeleted: false,
      isDuplicate: true,
      duplicateCandidateId: existingCandidate._id.toString(),
      duplicateReason: 'Candidate with this name and email already exists',
    };
  }

  const { scores: _scores, ...parsedDataWithoutScores } = normalized;
  void _scores;

  return {
    ...parsedDataWithoutScores,
    organizationId,
    status: 'applied',
    isDeleted: false,
  };
}

async function processWithPremium(
  base64Resume: string,
  ctx: OrgCvParseContext,
): Promise<ProcessedResumeData> {
  const { activeProvider } = ctx.decryptedAiProviders;
  const apiKey = ctx.decryptedAiProviders[activeProvider]?.api_key;
  if (!apiKey) {
    throw new Error(
      `API key not found for active provider: ${activeProvider}`,
    );
  }

  const provider = AIProviderFactory.getProvider(activeProvider);
  const selectedModel =
    ctx.decryptedAiProviders[activeProvider]?.customModel ||
    ctx.decryptedAiProviders[activeProvider]?.model;

  return provider.processResume(base64Resume, apiKey, selectedModel);
}

/**
 * Parse a resume PDF for an org using bulk CV AI when configured, otherwise
 * premium AI Providers (same rules as `loadOrgCvParseContext`).
 */
export async function processOrgResume(
  ctx: OrgCvParseContext,
  input: ProcessOrgResumeInput,
): Promise<ProcessOrgResumeResult> {
  const { base64Resume, organizationId } = input;
  const filename = input.filename?.trim() || 'resume.pdf';
  const file = pdfFileFromBase64(base64Resume, filename);

  try {
    let parsedData: ProcessedResumeData;
    let usage: CvParseUsageMetadata;

    if (ctx.cvParseMode === 'bulk') {
      const { data, usedBulkCvProvider } = await extractBulkCvResumeFromPdfFile(
        file,
        ctx.bulkCvAi,
      );
      parsedData = data;
      usage = {
        cvParseMode: 'bulk',
        usedProvider: usedBulkCvProvider,
      };
    } else {
      parsedData = await processWithPremium(base64Resume, ctx);
      usage = {
        cvParseMode: 'premium',
        usedProvider: ctx.decryptedAiProviders.activeProvider,
      };
    }

    const data = await finalizeParsedResume(parsedData, organizationId, filename);
    return { data, usage };
  } catch (error) {
    if (isCvResumeProcessError(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to process resume';

    if (ctx.cvParseMode === 'bulk') {
      const order = buildBulkProviderAttemptOrder(
        ctx.bulkCvAi,
        filename,
        file.size,
      );
      throw new CvResumeProcessError(
        message,
        batchItemFieldsFromBulkAttempts(order),
      );
    }

    throw CvResumeProcessError.fromUsage(message, {
      cvParseMode: 'premium',
      usedProvider: ctx.decryptedAiProviders.activeProvider,
    });
  }
}
