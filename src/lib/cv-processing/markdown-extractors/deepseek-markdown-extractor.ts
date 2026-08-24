import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import {
  DEEPSEEK_API_BASE_URL,
  DEFAULT_DEEPSEEK_RESUME_MODEL,
} from '../config';
import { extractResumeFromMarkdownWithOpenAICompatible } from './openai-compatible-markdown-extractor';

export interface DeepseekMarkdownExtractorConfig {
  apiKey: string;
  model?: string;
  fetchInit?: RequestInit;
}

/**
 * Structured resume extraction from Docling Markdown via DeepSeek (OpenAI-compatible JSON mode).
 */
export async function extractResumeFromMarkdownWithDeepseek(
  markdown: string,
  config: DeepseekMarkdownExtractorConfig,
): Promise<ProcessedResumeData> {
  return extractResumeFromMarkdownWithOpenAICompatible(markdown, {
    apiKey: config.apiKey,
    model: config.model?.trim() || DEFAULT_DEEPSEEK_RESUME_MODEL,
    baseUrl: DEEPSEEK_API_BASE_URL,
    jsonMode: true,
    fetchInit: config.fetchInit,
  });
}
