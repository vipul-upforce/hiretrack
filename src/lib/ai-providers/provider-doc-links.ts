import type { AIProviderType } from './types';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';

type SupportedProviderId = AIProviderType | BulkCvProviderId;

export const PROVIDER_MODEL_DOC_URLS: Record<SupportedProviderId, string> = {
  gemini: 'https://ai.google.dev/api/models',
  openai: 'https://developers.openai.com/api/docs/models/all',
  anthropic: 'https://platform.claude.com/docs/en/about-claude/models/overview',
  perplexity: 'https://docs.perplexity.ai/docs/agent-api/models',
  groq: 'https://console.groq.com/docs/models',
  deepseek: 'https://api-docs.deepseek.com/api/list-models',
  openrouter: 'https://openrouter.ai/models',
  cerebras: 'https://inference-docs.cerebras.ai/models/overview',
  mistral: 'https://docs.mistral.ai/models/overview',
};

export const PROVIDER_API_KEY_DOC_URLS: Partial<
  Record<SupportedProviderId, string>
> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  perplexity: 'https://www.perplexity.ai/settings/api',
  groq: 'https://console.groq.com/keys',
  deepseek: 'https://platform.deepseek.com/api_keys',
  openrouter: 'https://openrouter.ai/settings/keys',
  cerebras: 'https://cloud.cerebras.ai/platform/api-keys',
  mistral: 'https://console.mistral.ai/api-keys/',
};
