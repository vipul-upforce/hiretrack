import Groq from 'groq-sdk';
import { BaseAIProvider } from '@/lib/ai-providers/base-provider';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import { DEFAULT_GROQ_RESUME_MODEL } from '../config';

export interface GroqMarkdownExtractorConfig {
  apiKey: string;
  model?: string;
}

/**
 * Runs structured resume extraction on Docling Markdown using Groq (JSON mode).
 * Uses the same schema instructions as PDF-based providers via `BaseAIProvider`.
 */
export async function extractResumeFromMarkdownWithGroq(
  markdown: string,
  config: GroqMarkdownExtractorConfig,
): Promise<ProcessedResumeData> {
  const groq = new Groq({ apiKey: config.apiKey });
  const model = config.model?.trim() || DEFAULT_GROQ_RESUME_MODEL;

  const systemPrompt =
    'You are an HR data extraction system. Output ONLY valid JSON. No markdown fences or commentary.';

  const userContent = `${BaseAIProvider.getStandardPrompt()}\n\n===== CV START =====\n${markdown}\n===== CV END =====`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Groq returned empty extraction content');
  }

  const cleaned = BaseAIProvider.cleanJsonResponse(raw);
  return BaseAIProvider.parseJsonResponse(cleaned);
}
