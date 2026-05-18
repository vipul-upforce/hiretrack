import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import type { IBulkCvAi } from '@/lib/types/bulk-cv-ai';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { decryptBulkCvAi } from '@/lib/encryption';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
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
import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import { resolveRoundRobinIndex } from '../routing/provider-round-robin';
import { parsePdfToMarkdownViaDocling } from '../docling/parse-pdf-to-markdown';

/**
 * Stable order used as a tiebreaker when multiple providers are ready and we
 * need a deterministic per-file pick. Keep in sync with `BULK_CV_PROVIDER_IDS`.
 */
const BULK_EXTRACTOR_ORDER: readonly BulkCvExtractorProvider[] =
  BULK_CV_PROVIDER_IDS;

/**
 * Cheap, deterministic hash of (file name + size) so the round-robin pick is
 * stable across retries of the same file but evenly spread across a batch.
 * djb2-ish on top of `Math.imul` for the standard "good-enough" mix.
 */
function hashFileRoutingSeed(fileName: string, fileSize: number): number {
  const s = `${fileName}\0${String(fileSize)}`;
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  if (h === -2147483648) return 0;
  return Math.abs(h);
}

function isBulkExtractorProvider(v: string): v is BulkCvExtractorProvider {
  return (BULK_CV_PROVIDER_IDS as readonly string[]).includes(v);
}

export type BulkCvProviderReadiness = Record<
  BulkCvExtractorProvider,
  boolean
>;

function readyProviders(
  readiness: BulkCvProviderReadiness,
): BulkCvExtractorProvider[] {
  return BULK_EXTRACTOR_ORDER.filter((id) => readiness[id]);
}

/**
 * Deterministic primary among `ready`, then the rest in stable registry order.
 */
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

function buildReadinessAndSlots(bulkCvAi: IBulkCvAi | null | undefined): {
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

export interface RunBulkCvExtractResult {
  ok: true;
  data: ProcessedResumeData;
  /** Set when the server auto-fallback path picked a provider (omit `provider` in form). */
  usedBulkCvProvider?: BulkCvExtractorProvider;
}

export interface RunBulkCvExtractError {
  ok: false;
  message: string;
  status: number;
}

/**
 * Returns which bulk CV extractors have a usable key (org slot or supported
 * env fallback). Same rules as `runBulkCvExtractFromRequest`.
 */
export async function getBulkCvProviderReadinessForRequest(
  req: NextRequest,
): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; bulkCvProviderReadiness: BulkCvProviderReadiness }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  await connectToDatabase();
  if (!Settings) {
    return { ok: false, status: 500, message: 'Database not connected' };
  }

  const row = await Settings.findOne({ organizationId: user.organizationId })
    .select('bulkCvAi')
    .lean()
    .exec();

  const bulkCvAi = decryptBulkCvAi(
    row?.bulkCvAi as IBulkCvAi | undefined,
    user.organizationId,
  );

  const { readiness } = buildReadinessAndSlots(bulkCvAi);
  return { ok: true, bulkCvProviderReadiness: readiness };
}

/**
 * Authenticated PDF upload: org Bulk CV AI settings → Docling → one or more of
 * Groq / Gemini / DeepSeek / OpenRouter / Cerebras / Mistral → `ProcessedResumeData`.
 *
 * Routing rules (highest priority first):
 *   1. `options.forceProvider` (callers that must pin a provider) — must be ready.
 *   2. Multipart `provider` field (client pinned one) — must be ready or **400**.
 *   3. No `provider` field: **one** Docling parse, then try ready providers in
 *      deterministic round-robin order until one succeeds (same order as bulk UI).
 *   4. If nothing is ready: **400** before parsing.
 *
 * Env fallbacks when org DB slot is empty: `GROQ_API_KEY`, `DEEPSEEK_API_KEY`,
 * `OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`.
 */
export async function runBulkCvExtractFromRequest(
  req: NextRequest,
  options: { forceProvider?: BulkCvExtractorProvider } = {},
): Promise<RunBulkCvExtractResult | RunBulkCvExtractError> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { ok: false, message: 'Unauthorized', status: 401 };
  }

  await connectToDatabase();
  if (!Settings) {
    return { ok: false, message: 'Database not connected', status: 500 };
  }

  const row = await Settings.findOne({ organizationId: user.organizationId })
    .select('bulkCvAi')
    .lean()
    .exec();

  const bulkCvAi = decryptBulkCvAi(
    row?.bulkCvAi as IBulkCvAi | undefined,
    user.organizationId,
  );

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return { ok: false, message: 'Invalid form data', status: 400 };
  }

  const file = formData.get('file');
  const providerField = formData.get('provider');

  if (!(file instanceof File)) {
    return { ok: false, message: 'No PDF file provided.', status: 400 };
  }

  const ctx = buildReadinessAndSlots(bulkCvAi);
  const { readiness, doclingUrl } = ctx;
  const keys = {
    groqKey: ctx.groqKey,
    geminiKey: ctx.geminiKey,
    deepseekKey: ctx.deepseekKey,
    openrouterKey: ctx.openrouterKey,
    cerebrasKey: ctx.cerebrasKey,
    mistralKey: ctx.mistralKey,
  };

  const ready = readyProviders(readiness);
  if (ready.length === 0) {
    return {
      ok: false,
      message:
        'No bulk CV AI providers are configured. Add at least one API key under Settings → Bulk CV AI (Groq can use GROQ_API_KEY in development).',
      status: 400,
    };
  }

  const explicitFromForm =
    typeof providerField === 'string' &&
    providerField.trim() !== '' &&
    isBulkExtractorProvider(providerField.trim())
      ? (providerField.trim() as BulkCvExtractorProvider)
      : null;

  if (typeof options.forceProvider === 'string') {
    if (!isBulkExtractorProvider(options.forceProvider)) {
      return {
        ok: false,
        message: `Invalid forceProvider: ${String(options.forceProvider)}`,
        status: 400,
      };
    }
    if (!readiness[options.forceProvider]) {
      return {
        ok: false,
        message: `Bulk CV provider "${options.forceProvider}" is not configured (no API key).`,
        status: 400,
      };
    }
    try {
      const provider = options.forceProvider;
      const data = await runBulkCvResumePipeline(
        file,
        buildPipelineOptions(bulkCvAi, keys, doclingUrl, provider),
      );
      return { ok: true, data, usedBulkCvProvider: provider };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Extraction failed';
      return { ok: false, message, status: 500 };
    }
  }

  if (explicitFromForm) {
    if (!readiness[explicitFromForm]) {
      return {
        ok: false,
        message: `Bulk CV provider "${explicitFromForm}" is not configured (no API key). Add it under Settings → Bulk CV AI.`,
        status: 400,
      };
    }
    try {
      const data = await runBulkCvResumePipeline(
        file,
        buildPipelineOptions(bulkCvAi, keys, doclingUrl, explicitFromForm),
      );
      return {
        ok: true,
        data,
        usedBulkCvProvider: explicitFromForm,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Extraction failed';
      return { ok: false, message, status: 500 };
    }
  }

  /** Auto mode: one Docling parse, then try each ready provider until success. */
  const order = buildServerFallbackOrder(ready, file.name, file.size);

  try {
    const markdown = await parsePdfToMarkdownViaDocling(file, doclingUrl);
    const errors: string[] = [];

    for (const provider of order) {
      try {
        const full = buildPipelineOptions(
          bulkCvAi,
          keys,
          doclingUrl,
          provider,
        );
        const { doclingParseUrl: _omit, ...rest } = full;
        void _omit;
        const data = await extractBulkCvResumeFromMarkdown(markdown, {
          ...rest,
          provider,
        });
        return { ok: true, data, usedBulkCvProvider: provider };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider}: ${msg}`);
      }
    }

    return {
      ok: false,
      message: `All configured bulk CV providers failed for this file. ${errors.join(' | ')}`,
      status: 502,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Extraction failed';
    return { ok: false, message, status: 500 };
  }
}
