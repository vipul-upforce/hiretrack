import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import {
  DEFAULT_MISTRAL_RESUME_MODEL,
  MISTRAL_API_BASE_URL,
} from '../config';
import { extractResumeFromMarkdownWithOpenAICompatible } from './openai-compatible-markdown-extractor';

export interface MistralMarkdownExtractorConfig {
  apiKey: string;
  model?: string;
  fetchInit?: RequestInit;
}

/**
 * Docling Markdown → structured resume JSON via Mistral API
 * (OpenAI-compatible `POST /v1/chat/completions`).
 */
export async function extractResumeFromMarkdownWithMistral(
  markdown: string,
  config: MistralMarkdownExtractorConfig,
): Promise<ProcessedResumeData> {
  return extractResumeFromMarkdownWithOpenAICompatible(markdown, {
    apiKey: config.apiKey,
    model: config.model?.trim() || DEFAULT_MISTRAL_RESUME_MODEL,
    baseUrl: MISTRAL_API_BASE_URL,
    jsonMode: true,
    fetchInit: config.fetchInit,
  });
}
