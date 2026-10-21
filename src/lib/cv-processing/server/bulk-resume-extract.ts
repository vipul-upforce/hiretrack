import { batchItemFieldsFromBulkAttempts } from '../cv-parse-usage';
import type { IBulkCvAi } from '@/lib/types/bulk-cv-ai';
import { CvResumeProcessError } from './cv-resume-process-error';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import {
  BULK_CV_PROVIDER_IDS,
  DEFAULT_CEREBRAS_RESUME_MODEL,
  DEFAULT_DEEPSEEK_RESUME_MODEL,
  DEFAULT_GROQ_RESUME_MODEL,
  DEFAULT_MISTRAL_RESUME_MODEL,
  DEFAULT_OPENROUTER_RESUME_MODEL,
  resolveCerebrasApiKey,
  resolveDeepseekApiKey,
  resolveDoclingParseUrl,
  resolveGroqApiKey,
  resolveMistralApiKey,
  resolveOpenRouterApiKey,
} from '../config';
import type { BulkCvExtractorProvider } from '../pipelines/bulk-cv-resume';
import {
  extractBulkCvResumeFromMarkdown,
  runBulkCvResumePipeline,
} from '../pipelines/bulk-cv-resume';
import { resolveRoundRobinIndex } from '../routing/provider-round-robin';
import { parsePdfToMarkdownViaDocling } from '../docling/parse-pdf-to-markdown';
import logger from '@/lib/logger';
import { extractPdfTextForCv } from '@/lib/cv-upload/pdf-text-extraction';

export type BulkCvProviderReadiness = Record<BulkCvExtractorProvider, boolean>;

const BULK_EXTRACTOR_ORDER: readonly BulkCvExtractorProvider[] =
  BULK_CV_PROVIDER_IDS;

function hashFileRoutingSeed(fileName: string, fileSize: number): number {
  const s = `${fileName}\0${String(fileSize)}`;
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  if (h === -2147483648) return 0;
  return Math.abs(h);
}

function effectiveSlotModel(
  slot: IBulkCvAi[BulkCvExtractorProvider] | undefined,
  fallback: string,
): string {
  if (!slot) return fallback;
  if (slot.model === 'custom' && slot.customModel?.trim()) {
    return slot.customModel.trim();
  }
  return slot.model?.trim() || fallback;
}

export function buildBulkCvReadinessAndSlots(
  bulkCvAi: IBulkCvAi | null | undefined,
): {
  readiness: BulkCvProviderReadiness;
  doclingUrl: string;
  groqKey: string;
  geminiKey: string;
  deepseekKey: string;
  openrouterKey: string;
  cerebrasKey: string;
  mistralKey: string;
} {
  const doclingUrl =
    bulkCvAi?.doclingParseUrl?.trim() || resolveDoclingParseUrl();

  const groqKey =
    (bulkCvAi?.groq?.api_key?.trim() ?? '') || resolveGroqApiKey() || '';
  const geminiKey = bulkCvAi?.gemini?.api_key?.trim() ?? '';
  const deepseekKey =
    (bulkCvAi?.deepseek?.api_key?.trim() ?? '') ||
    resolveDeepseekApiKey() ||
    '';
  const openrouterKey =
    (bulkCvAi?.openrouter?.api_key?.trim() ?? '') ||
    resolveOpenRouterApiKey() ||
    '';
  const cerebrasKey =
    (bulkCvAi?.cerebras?.api_key?.trim() ?? '') ||
    resolveCerebrasApiKey() ||
    '';
  const mistralKey =
    (bulkCvAi?.mistral?.api_key?.trim() ?? '') || resolveMistralApiKey() || '';

  const readiness: BulkCvProviderReadiness = {
    groq: Boolean(groqKey),
    gemini: Boolean(geminiKey),
    deepseek: Boolean(deepseekKey),
    openrouter: Boolean(openrouterKey),
    cerebras: Boolean(cerebrasKey),
    mistral: Boolean(mistralKey),
  };

  return {
    readiness,
    doclingUrl,
    groqKey,
    geminiKey,
    deepseekKey,
    openrouterKey,
    cerebrasKey,
    mistralKey,
  };
}

export function readyBulkCvProviders(
  readiness: BulkCvProviderReadiness,
): BulkCvExtractorProvider[] {
  return BULK_EXTRACTOR_ORDER.filter((id) => readiness[id]);
}

export function buildBulkProviderAttemptOrder(
  bulkCvAi: IBulkCvAi | null | undefined,
  fileName: string,
  fileSize: number,
): BulkCvExtractorProvider[] {
  const { readiness } = buildBulkCvReadinessAndSlots(bulkCvAi);
  const ready = readyBulkCvProviders(readiness);
  return buildServerFallbackOrder(ready, fileName, fileSize);
}

/** Round-robin + failover order for non-file workloads (e.g. candidate evaluation). */
export function buildBulkProviderAttemptOrderForSeed(
  bulkCvAi: IBulkCvAi | null | undefined,
  routingSeed: string,
): BulkCvExtractorProvider[] {
  const { readiness } = buildBulkCvReadinessAndSlots(bulkCvAi);
  const ready = readyBulkCvProviders(readiness);
  return buildServerFallbackOrder(ready, routingSeed, 0);
}

function buildServerFallbackOrder(
  ready: BulkCvExtractorProvider[],
  fileName: string,
  fileSize: number,
): BulkCvExtractorProvider[] {
  if (ready.length === 0) return [];
  if (ready.length === 1) return [ready[0]!];
  const seed = hashFileRoutingSeed(fileName, fileSize);
  const idx = resolveRoundRobinIndex(seed, ready.length);
  const primary = ready[idx]!;
  return [primary, ...ready.filter((p) => p !== primary)];
}

function buildPipelineOptions(
  bulkCvAi: IBulkCvAi | null | undefined,
  keys: {
    groqKey: string;
    geminiKey: string;
    deepseekKey: string;
    openrouterKey: string;
    cerebrasKey: string;
    mistralKey: string;
  },
  doclingUrl: string,
  provider: BulkCvExtractorProvider,
) {
  return {
    provider,
    doclingParseUrl: doclingUrl,
    groq: {
      apiKey: keys.groqKey,
      model: effectiveSlotModel(bulkCvAi?.groq, DEFAULT_GROQ_RESUME_MODEL),
    },
    gemini: {
      apiKey: keys.geminiKey,
      model: effectiveSlotModel(bulkCvAi?.gemini, getDefaultModel('gemini')),
    },
    deepseek: {
      apiKey: keys.deepseekKey,
      model: effectiveSlotModel(
        bulkCvAi?.deepseek,
        DEFAULT_DEEPSEEK_RESUME_MODEL,
      ),
    },
    openrouter: {
      apiKey: keys.openrouterKey,
      model: effectiveSlotModel(
        bulkCvAi?.openrouter,
        DEFAULT_OPENROUTER_RESUME_MODEL,
      ),
      referer: process.env.OPENROUTER_HTTP_REFERER?.trim() || undefined,
      appTitle: process.env.OPENROUTER_APP_TITLE?.trim() || 'HireTrack Bulk CV',
    },
    cerebras: {
      apiKey: keys.cerebrasKey,
      model: effectiveSlotModel(
        bulkCvAi?.cerebras,
        DEFAULT_CEREBRAS_RESUME_MODEL,
      ),
    },
    mistral: {
      apiKey: keys.mistralKey,
      model: effectiveSlotModel(
        bulkCvAi?.mistral,
        DEFAULT_MISTRAL_RESUME_MODEL,
      ),
    },
  } as const;
}

/** Build a PDF `File` from raw base64 (no data-URL prefix). */
export function pdfFileFromBase64(
  base64Resume: string,
  filename: string,
): File {
  const buffer = Buffer.from(base64Resume, 'base64');
  const safeName = filename.trim() || 'resume.pdf';
  const mime = 'application/pdf';
  return new File([buffer], safeName, { type: mime });
}

export interface BulkCvExtractFromFileResult {
  data: ProcessedResumeData;
  usedBulkCvProvider: BulkCvExtractorProvider;
}

async function extractFallbackTextViaOcr(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64Pdf = Buffer.from(arrayBuffer).toString('base64');
  return extractPdfTextForCv(base64Pdf);
}

/**
 * PDF → markdown → round-robin across ready bulk providers until one succeeds.
 */
export async function extractBulkCvResumeFromPdfFile(
  file: File,
  bulkCvAi: IBulkCvAi | null | undefined,
): Promise<BulkCvExtractFromFileResult> {
  const ctx = buildBulkCvReadinessAndSlots(bulkCvAi);
  const ready = readyBulkCvProviders(ctx.readiness);
  if (ready.length === 0) {
    throw new Error(
      'No bulk CV AI providers are configured. Add API keys under Settings → Bulk CV AI.',
    );
  }

  const keys = {
    groqKey: ctx.groqKey,
    geminiKey: ctx.geminiKey,
    deepseekKey: ctx.deepseekKey,
    openrouterKey: ctx.openrouterKey,
    cerebrasKey: ctx.cerebrasKey,
    mistralKey: ctx.mistralKey,
  };

  const order = buildServerFallbackOrder(ready, file.name, file.size);
  const attemptFields = batchItemFieldsFromBulkAttempts(order);
  logger.info({
    event: 'cv_bulk_pipeline_started',
    fileName: file.name,
    fileSize: file.size,
    parseUrl: ctx.doclingUrl,
    providerOrder: order,
  });

  let markdown: string;
  try {
    markdown = await parsePdfToMarkdownViaDocling(file, ctx.doclingUrl);
    logger.info({
      event: 'cv_bulk_pipeline_markdown_ready',
      fileName: file.name,
      fileSize: file.size,
      markdownChars: markdown.trim().length,
      providerOrder: order,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({
      event: 'cv_bulk_pipeline_markdown_failed',
      fileName: file.name,
      fileSize: file.size,
      parseUrl: ctx.doclingUrl,
      providerOrder: order,
      error: msg,
    });
    const isUnusableMarkdownError = msg.includes('did not return usable markdown');
    if (!isUnusableMarkdownError) {
      throw new CvResumeProcessError(`PDF parse failed before extraction: ${msg}`, {
        cvParseMode: 'bulk',
        usedProvider: order[0] ?? '',
        parseProviderLabel: 'Bulk parsing · PDF parse',
      });
    }

    try {
      markdown = await extractFallbackTextViaOcr(file);
      logger.warn({
        event: 'cv_bulk_pipeline_ocr_fallback_used',
        fileName: file.name,
        fileSize: file.size,
        markdownChars: markdown.trim().length,
      });
    } catch (ocrError) {
      const ocrMessage =
        ocrError instanceof Error ? ocrError.message : String(ocrError);
      logger.error({
        event: 'cv_bulk_pipeline_ocr_fallback_failed',
        fileName: file.name,
        fileSize: file.size,
        parseUrl: ctx.doclingUrl,
        error: ocrMessage,
      });
      throw new CvResumeProcessError(
        `PDF parse failed before extraction: ${msg}; OCR fallback failed: ${ocrMessage}`,
        {
          cvParseMode: 'bulk',
          usedProvider: order[0] ?? '',
          parseProviderLabel: 'Bulk parsing · PDF parse',
        },
      );
    }
  }

  const errors: string[] = [];

  for (const provider of order) {
    try {
      logger.info({
        event: 'cv_bulk_provider_attempt_started',
        fileName: file.name,
        fileSize: file.size,
        provider,
      });
      const full = buildPipelineOptions(
        bulkCvAi,
        keys,
        ctx.doclingUrl,
        provider,
      );
      const { doclingParseUrl: _omit, ...rest } = full;
      void _omit;
      const data = await extractBulkCvResumeFromMarkdown(markdown, {
        ...rest,
        provider,
      });
      logger.info({
        event: 'cv_bulk_provider_attempt_succeeded',
        fileName: file.name,
        fileSize: file.size,
        provider,
      });
      return { data, usedBulkCvProvider: provider };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider}: ${msg}`);
      logger.warn({
        event: 'cv_bulk_provider_attempt_failed',
        fileName: file.name,
        fileSize: file.size,
        provider,
        error: msg,
      });
    }
  }

  throw new CvResumeProcessError(
    `All configured bulk CV providers failed for this file. ${errors.join(' | ')}`,
    attemptFields,
  );
}

/** Single-provider path (explicit pin from multipart). */
export async function extractBulkCvResumeFromPdfFileWithProvider(
  file: File,
  bulkCvAi: IBulkCvAi | null | undefined,
  provider: BulkCvExtractorProvider,
): Promise<BulkCvExtractFromFileResult> {
  const ctx = buildBulkCvReadinessAndSlots(bulkCvAi);
  if (!ctx.readiness[provider]) {
    throw new Error(
      `Bulk CV provider "${provider}" is not configured (no API key).`,
    );
  }
  const keys = {
    groqKey: ctx.groqKey,
    geminiKey: ctx.geminiKey,
    deepseekKey: ctx.deepseekKey,
    openrouterKey: ctx.openrouterKey,
    cerebrasKey: ctx.cerebrasKey,
    mistralKey: ctx.mistralKey,
  };
  const data = await runBulkCvResumePipeline(
    file,
    buildPipelineOptions(bulkCvAi, keys, ctx.doclingUrl, provider),
  );
  return { data, usedBulkCvProvider: provider };
}
