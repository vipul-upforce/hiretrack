import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import {
  DEFAULT_OPENROUTER_RESUME_MODEL,
  OPENROUTER_API_BASE_URL,
} from '../config';
import { extractResumeFromMarkdownWithOpenAICompatible } from './openai-compatible-markdown-extractor';

export interface OpenRouterMarkdownExtractorConfig {
  apiKey: string;
  model?: string;
  /**
   * Optional "site" identification - OpenRouter uses these for analytics and
   * (per their docs) for rate-limit fairness. Both are optional but cheap to
   * send. Pulled from env at the caller so this extractor stays generic.
   */
  referer?: string;
  appTitle?: string;
  fetchInit?: RequestInit;
}

/**
 * Structured resume extraction from Docling Markdown via OpenRouter.
 *
 * Note on free models: some `:free` tagged models silently ignore
 * `response_format=json_object`; the shared extractor falls back to
 * `BaseAIProvider.cleanJsonResponse` + `parseJsonResponse` to recover JSON
 * from prose, so we keep `jsonMode: true` as a best-effort hint.
 */
export async function extractResumeFromMarkdownWithOpenRouter(
  markdown: string,
  config: OpenRouterMarkdownExtractorConfig,
): Promise<ProcessedResumeData> {
  const extraHeaders: Record<string, string> = {};
  if (config.referer) extraHeaders['HTTP-Referer'] = config.referer;
  if (config.appTitle) extraHeaders['X-Title'] = config.appTitle;

  return extractResumeFromMarkdownWithOpenAICompatible(markdown, {
    apiKey: config.apiKey,
    model: config.model?.trim() || DEFAULT_OPENROUTER_RESUME_MODEL,
    baseUrl: OPENROUTER_API_BASE_URL,
    jsonMode: true,
    extraHeaders,
    fetchInit: config.fetchInit,
  });
}
