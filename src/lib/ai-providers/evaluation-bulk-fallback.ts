import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IBulkCvAi, BulkCvProviderId } from '@/lib/types/bulk-cv-ai';
import {
  BULK_CV_PROVIDER_LABELS,
  CEREBRAS_API_BASE_URL,
  DEFAULT_CEREBRAS_RESUME_MODEL,
  DEFAULT_DEEPSEEK_RESUME_MODEL,
  DEFAULT_GROQ_RESUME_MODEL,
  DEFAULT_MISTRAL_RESUME_MODEL,
  DEFAULT_OPENROUTER_RESUME_MODEL,
  DEEPSEEK_API_BASE_URL,
  MISTRAL_API_BASE_URL,
  OPENROUTER_API_BASE_URL,
} from '@/lib/cv-processing/config';
import {
  buildBulkCvReadinessAndSlots,
  buildBulkProviderAttemptOrderForSeed,
} from '@/lib/cv-processing/server/bulk-resume-extract';
import type { BulkCvExtractorProvider } from '@/lib/cv-processing/pipelines/bulk-cv-resume';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import { parseEvaluationResponse } from './evaluation-parser';
import logger from '../logger';

const EVALUATION_SYSTEM_PROMPT =
  'You are an expert technical recruiter evaluating candidates. Provide honest, detailed evaluations. Return ONLY valid JSON based on the structure provided. Never include explanations, markdown fences, or commentary.';

const RETRYABLE_ERROR_PATTERNS = [
  /invalid[_\s-]?api[_\s-]?key/i,
  /incorrect api key/i,
  /api[_\s-]?key[_\s-]?invalid/i,
  /authentication/i,
  /unauthorized/i,
  /forbidden/i,
  /insufficient[_\s-]?quota/i,
  /rate[_\s-]?limit/i,
  /too many requests/i,
  /quota exceeded/i,
  /billing/i,
  /timed out/i,
  /timeout/i,
  /abort/i,
  /econnreset/i,
  /etimedout/i,
  /econnrefused/i,
  /fetch failed/i,
  /502/,
  /503/,
  /504/,
  /500/,
  /429/,
  /401/,
  /403/,
] as const;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: { message?: string; code?: string | number };
}

export interface BulkEvaluationFallbackResult {
  rawResponse: string;
  usedProvider: BulkCvExtractorProvider;
  usedModel: string;
}

export interface BulkEvaluationFallbackParams {
  resumeText: string;
  prompt: string;
  bulkCvAi: IBulkCvAi | null | undefined;
  temperature: number;
  routingSeed: string;
  /** API keys to skip (e.g. the main provider key that already failed). */
  excludeApiKeys?: string[];
}

/** When unset, bulk pool fallback is enabled. Set `EVALUATION_BULK_FALLBACK=false` to disable. */
export function isBulkEvaluationFallbackEnabled(): boolean {
  const raw = process.env.EVALUATION_BULK_FALLBACK?.trim().toLowerCase();
  return raw !== 'false' && raw !== '0';
}

export function isRetryableEvaluationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.trim()) {
    return false;
  }
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function effectiveSlotModel(
  slot: IBulkCvAi[BulkCvProviderId] | undefined,
  fallback: string,
): string {
  if (!slot) return fallback;
  if (slot.model === 'custom' && slot.customModel?.trim()) {
    return slot.customModel.trim();
  }
  return slot.model?.trim() || fallback;
}

function buildEvaluationUserContent(prompt: string, resumeText: string): string {
  return `${prompt}
===== CV START =====
${resumeText}
===== CV END =====
`;
}

function isExcludedApiKey(apiKey: string, excludeApiKeys: string[] | undefined): boolean {
  const trimmed = apiKey.trim();
  if (!trimmed) return true;
  return (excludeApiKeys ?? []).some((key) => key.trim() === trimmed);
}

async function completeWithOpenAICompatible(params: {
  apiKey: string;
  model: string;
  baseUrl: string;
  prompt: string;
  resumeText: string;
  temperature: number;
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const url = `${params.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const userContent = buildEvaluationUserContent(params.prompt, params.resumeText);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
      ...(params.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.temperature,
      messages: [
        { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `OpenAI-compatible evaluation failed: HTTP ${response.status}${text ? ` — ${text.slice(0, 500)}` : ''}`,
    );
  }

  const json = (await response.json()) as ChatCompletionResponse;
  if (json.error?.message) {
    throw new Error(`OpenAI-compatible evaluation error: ${json.error.message}`);
  }

  const raw = json.choices?.[0]?.message?.content ?? '';
  if (!raw.trim()) {
    throw new Error('OpenAI-compatible evaluation returned empty content');
  }
  return raw;
}

async function evaluateWithBulkGroq(
  prompt: string,
  resumeText: string,
  apiKey: string,
  model: string,
  temperature: number,
): Promise<string> {
  const groq = new Groq({ apiKey });
  const userContent = buildEvaluationUserContent(prompt, resumeText);
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    model,
    temperature,
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw?.trim()) {
    throw new Error('Groq evaluation returned empty content');
  }
  return raw;
}

async function evaluateWithBulkGemini(
  prompt: string,
  resumeText: string,
  apiKey: string,
  model: string,
  temperature: number,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature,
    },
  });
  const userText = `${EVALUATION_SYSTEM_PROMPT}\n\n${buildEvaluationUserContent(prompt, resumeText)}`;
  const result = await generativeModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: userText }] }],
  });
  const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!raw.trim()) {
    throw new Error('Gemini evaluation returned empty content');
  }
  return raw;
}

async function evaluateWithBulkProvider(
  provider: BulkCvExtractorProvider,
  bulkCvAi: IBulkCvAi | null | undefined,
  keys: ReturnType<typeof buildBulkCvReadinessAndSlots>,
  prompt: string,
  resumeText: string,
  temperature: number,
): Promise<{ raw: string; model: string }> {
  switch (provider) {
    case 'groq': {
      const model = effectiveSlotModel(bulkCvAi?.groq, DEFAULT_GROQ_RESUME_MODEL);
      const raw = await evaluateWithBulkGroq(
        prompt,
        resumeText,
        keys.groqKey,
        model,
        temperature,
      );
      return { raw, model };
    }
    case 'gemini': {
      const model = effectiveSlotModel(bulkCvAi?.gemini, getDefaultModel('gemini'));
      const raw = await evaluateWithBulkGemini(
        prompt,
        resumeText,
        keys.geminiKey,
        model,
        temperature,
      );
      return { raw, model };
    }
    case 'deepseek': {
      const model = effectiveSlotModel(
        bulkCvAi?.deepseek,
        DEFAULT_DEEPSEEK_RESUME_MODEL,
      );
      const raw = await completeWithOpenAICompatible({
        apiKey: keys.deepseekKey,
        model,
        baseUrl: DEEPSEEK_API_BASE_URL,
        prompt,
        resumeText,
        temperature,
      });
      return { raw, model };
    }
    case 'openrouter': {
      const model = effectiveSlotModel(
        bulkCvAi?.openrouter,
        DEFAULT_OPENROUTER_RESUME_MODEL,
      );
      const extraHeaders: Record<string, string> = {};
      const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
      const appTitle = process.env.OPENROUTER_APP_TITLE?.trim() || 'HireTrack Evaluation';
      if (referer) extraHeaders['HTTP-Referer'] = referer;
      if (appTitle) extraHeaders['X-Title'] = appTitle;
      const raw = await completeWithOpenAICompatible({
        apiKey: keys.openrouterKey,
        model,
        baseUrl: OPENROUTER_API_BASE_URL,
        prompt,
        resumeText,
        temperature,
        extraHeaders,
      });
      return { raw, model };
    }
    case 'cerebras': {
      const model = effectiveSlotModel(
        bulkCvAi?.cerebras,
        DEFAULT_CEREBRAS_RESUME_MODEL,
      );
      const raw = await completeWithOpenAICompatible({
        apiKey: keys.cerebrasKey,
        model,
        baseUrl: CEREBRAS_API_BASE_URL,
        prompt,
        resumeText,
        temperature,
      });
      return { raw, model };
    }
    case 'mistral': {
      const model = effectiveSlotModel(
        bulkCvAi?.mistral,
        DEFAULT_MISTRAL_RESUME_MODEL,
      );
      const raw = await completeWithOpenAICompatible({
        apiKey: keys.mistralKey,
        model,
        baseUrl: MISTRAL_API_BASE_URL,
        prompt,
        resumeText,
        temperature,
      });
      return { raw, model };
    }
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unsupported bulk evaluation provider: ${String(exhaustive)}`);
    }
  }
}

function bulkProviderApiKey(
  provider: BulkCvExtractorProvider,
  keys: ReturnType<typeof buildBulkCvReadinessAndSlots>,
): string {
  switch (provider) {
    case 'groq':
      return keys.groqKey;
    case 'gemini':
      return keys.geminiKey;
    case 'deepseek':
      return keys.deepseekKey;
    case 'openrouter':
      return keys.openrouterKey;
    case 'cerebras':
      return keys.cerebrasKey;
    case 'mistral':
      return keys.mistralKey;
    default: {
      const exhaustive: never = provider;
      return String(exhaustive);
    }
  }
}

/**
 * Runs candidate evaluation via the Bulk CV AI provider pool (round-robin + failover).
 * Validates each response with `parseEvaluationResponse` before accepting it.
 */
export async function evaluateWithBulkPoolFallback(
  params: BulkEvaluationFallbackParams,
): Promise<BulkEvaluationFallbackResult> {
  const order = buildBulkProviderAttemptOrderForSeed(
    params.bulkCvAi,
    params.routingSeed,
  );
  const keys = buildBulkCvReadinessAndSlots(params.bulkCvAi);
  const eligibleOrder = order.filter(
    (provider) =>
      !isExcludedApiKey(bulkProviderApiKey(provider, keys), params.excludeApiKeys),
  );
  if (eligibleOrder.length === 0) {
    throw new Error(
      'Bulk CV AI pool fallback is not available: no eligible bulk provider keys remain after excluding the failed main provider key.',
    );
  }

  const errors: string[] = [];

  for (const provider of eligibleOrder) {
    const apiKey = bulkProviderApiKey(provider, keys);
    try {
      logger.info({
        event: 'evaluation_bulk_fallback_attempt_started',
        provider,
        routingSeed: params.routingSeed,
      });

      const { raw, model } = await evaluateWithBulkProvider(
        provider,
        params.bulkCvAi,
        keys,
        params.prompt,
        params.resumeText,
        params.temperature,
      );

      parseEvaluationResponse(raw);

      logger.info({
        event: 'evaluation_bulk_fallback_attempt_succeeded',
        provider,
        model,
        routingSeed: params.routingSeed,
      });

      return {
        rawResponse: raw,
        usedProvider: provider,
        usedModel: model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider}: ${message}`);
      logger.warn({
        event: 'evaluation_bulk_fallback_attempt_failed',
        provider,
        routingSeed: params.routingSeed,
        error: message,
      });
    }
  }

  throw new Error(
    `All bulk CV AI pool providers failed for evaluation. ${errors.join(' | ')}`,
  );
}

export function formatBulkFallbackMetadata(
  usedProvider: BulkCvExtractorProvider,
  usedModel: string,
  settings: { timeZone?: { name?: string } },
): string {
  const now = new Date();
  const userTimezone = settings?.timeZone?.name || 'UTC';
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: userTimezone,
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone,
  });
  const label = BULK_CV_PROVIDER_LABELS[usedProvider] ?? usedProvider;
  return `\n\n[Fallback] Evaluated by ${label} (${usedModel}) on ${dateStr} at ${timeStr}`;
}
