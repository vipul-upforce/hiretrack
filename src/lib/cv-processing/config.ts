import type {
  BulkCvProviderId,
  CvUploadPool,
  IBulkCvAi,
} from '@/lib/types/bulk-cv-ai';

/** Fallback when `DOCLING_PARSE_URL` is unset (override in production via env). */
export const DEFAULT_DOCLING_PARSE_URL = 'http://185.185.126.124:8000/parse';

export const DEFAULT_GROQ_RESUME_MODEL = 'llama-3.1-8b-instant';
export const DEFAULT_DEEPSEEK_RESUME_MODEL = 'deepseek-chat';
/**
 * OpenRouter exposes many free-tier model ids that change occasionally; we pick
 * a stable free Llama instruct here, and the form's "Custom model id" field
 * lets the org override without a redeploy.
 */
export const DEFAULT_OPENROUTER_RESUME_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

/** Cerebras Inference — OpenAI-compatible. */
export const DEFAULT_CEREBRAS_RESUME_MODEL = 'llama3.1-8b';

/** Mistral — OpenAI-compatible chat at api.mistral.ai/v1. */
export const DEFAULT_MISTRAL_RESUME_MODEL = 'mistral-small-latest';

export const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';
export const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';
export const CEREBRAS_API_BASE_URL = 'https://api.cerebras.ai/v1';
export const MISTRAL_API_BASE_URL = 'https://api.mistral.ai/v1';

export function resolveDoclingParseUrl(): string {
  const fromEnv = process.env.DOCLING_PARSE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_DOCLING_PARSE_URL;
}

export function resolveGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function resolveDeepseekApiKey(): string | undefined {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function resolveOpenRouterApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function resolveCerebrasApiKey(): string | undefined {
  const key = process.env.CEREBRAS_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function resolveMistralApiKey(): string | undefined {
  const key = process.env.MISTRAL_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

/**
 * Single source of truth for bulk-CV-AI extractors. Order matters for the
 * "first ready" tiebreaker; everything else uses set semantics.
 */
export const BULK_CV_PROVIDER_IDS = [
  'groq',
  'gemini',
  'deepseek',
  'openrouter',
  'cerebras',
  'mistral',
] as const satisfies readonly BulkCvProviderId[];

/** Short title for each CV upload parsing mode (settings + upload UI). */
export const CV_UPLOAD_POOL_LABELS: Record<CvUploadPool, string> = {
  bulk: 'Multiple providers (take turns)',
  premium: 'Single provider (active from AI Providers)',
};

/** Extra line under each radio option in Bulk CV AI settings. */
export const CV_UPLOAD_POOL_DESCRIPTIONS: Record<CvUploadPool, string> = {
  bulk:
    'Several API keys (Groq, Gemini, etc.), often on free tiers, with round-robin. Configure and verify keys below.',
  premium:
    'One provider from AI Providers (OpenAI, Claude, Gemini, etc.). Keys below are saved but not used for upload while this option is selected.',
};

/**
 * Label for batch history / parse badges (not a Hiretrack product tier).
 * `bulk` = multiple bulk keys; `premium` = single active AI Providers key.
 */
export const CV_PARSE_PATH_LABELS: Record<CvUploadPool, string> = {
  bulk: 'Bulk parsing',
  premium: 'Main AI provider',
};

export const BULK_CV_PROVIDER_LABELS: Record<BulkCvProviderId, string> = {
  groq: 'Groq',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
  mistral: 'Mistral',
};

/** Minimum saved API keys required when persisting Bulk CV AI settings. */
export const MIN_BULK_CV_PROVIDERS_CONFIGURED = 2;

export function countBulkCvProvidersWithKeys(
  bulkCvAi: IBulkCvAi,
): number {
  return BULK_CV_PROVIDER_IDS.filter((id) =>
    Boolean(bulkCvAi[id]?.api_key?.trim()),
  ).length;
}
