import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import {
  CEREBRAS_API_BASE_URL,
  DEFAULT_CEREBRAS_RESUME_MODEL,
} from '../config';
import { extractResumeFromMarkdownWithOpenAICompatible } from './openai-compatible-markdown-extractor';

export interface CerebrasMarkdownExtractorConfig {
  apiKey: string;
  model?: string;
  fetchInit?: RequestInit;
}

/**
 * Docling Markdown → structured resume JSON via Cerebras Inference
 * (OpenAI-compatible chat completions).
 */
export async function extractResumeFromMarkdownWithCerebras(
  markdown: string,
  config: CerebrasMarkdownExtractorConfig,
): Promise<ProcessedResumeData> {
  return extractResumeFromMarkdownWithOpenAICompatible(markdown, {
    apiKey: config.apiKey,
    model: config.model?.trim() || DEFAULT_CEREBRAS_RESUME_MODEL,
    baseUrl: CEREBRAS_API_BASE_URL,
    jsonMode: true,
    fetchInit: config.fetchInit,
  });
}
