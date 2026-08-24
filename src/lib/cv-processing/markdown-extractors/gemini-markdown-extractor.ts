import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIProvider } from '@/lib/ai-providers/base-provider';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';

export interface GeminiMarkdownExtractorConfig {
  apiKey: string;
  model?: string;
}

/**
 * Structured resume extraction from Docling Markdown via Gemini (JSON response).
 */
export async function extractResumeFromMarkdownWithGemini(
  markdown: string,
  config: GeminiMarkdownExtractorConfig,
): Promise<ProcessedResumeData> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const selectedModel = config.model?.trim() || getDefaultModel('gemini');

  const model = genAI.getGenerativeModel({
    model: selectedModel,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const systemHint =
    'You are an HR data extraction system. Output ONLY valid JSON. No markdown fences or commentary.';

  const userText = `${systemHint}\n\n${BaseAIProvider.getStandardPrompt()}\n\n===== CV START =====\n${markdown}\n===== CV END =====`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userText }] }],
  });

  const raw =
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!raw) {
    throw new Error('Gemini returned empty extraction content');
  }

  const cleaned = BaseAIProvider.cleanJsonResponse(raw);
  return BaseAIProvider.parseJsonResponse(cleaned);
}
