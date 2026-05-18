import { BaseAIProvider } from '@/lib/ai-providers/base-provider';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';

export interface OpenAICompatibleExtractorConfig {
  apiKey: string;
  model: string;
  /** Base URL of the OpenAI-compatible server (no trailing /chat/completions). */
  baseUrl: string;
  /**
   * Optional extra headers (e.g. OpenRouter wants `HTTP-Referer` + `X-Title`).
   * `Authorization` and `Content-Type` are always set by the helper.
   */
  extraHeaders?: Record<string, string>;
  /**
   * Whether to request JSON mode. Most providers honor this; some free OpenRouter
   * models silently ignore it - the JSON cleaner in `BaseAIProvider` handles
   * stray prose in either case.
   */
  jsonMode?: boolean;
  /** Forwarded to `fetch` (timeouts, AbortSignal). */
  fetchInit?: RequestInit;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: { message?: string; code?: string | number };
}

/**
 * Drives an OpenAI Chat Completions style server (DeepSeek, OpenRouter, any
 * OpenAI-compatible gateway) to turn Docling Markdown into our structured
 * resume JSON.
 *
 * Why this lives alongside the SDK-based Groq/Gemini extractors:
 *   - Adding a new compatible vendor costs ~3 lines (a wrapper).
 *   - No extra SDK dependency, no extra cold-start cost on serverless.
 *   - Errors carry the upstream `error.message` straight through for the
 *     per-provider fallback chain in `bulk-extract-from-request.ts`.
 */
export async function extractResumeFromMarkdownWithOpenAICompatible(
  markdown: string,
  config: OpenAICompatibleExtractorConfig,
): Promise<ProcessedResumeData> {
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    throw new Error('OpenAI-compatible extractor: missing API key');
  }
  const model = config.model?.trim();
  if (!model) {
    throw new Error('OpenAI-compatible extractor: missing model');
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const systemPrompt =
    'You are an HR data extraction system. Output ONLY valid JSON. No markdown fences or commentary.';
  const userContent = `${BaseAIProvider.getStandardPrompt()}\n\n===== CV START =====\n${markdown}\n===== CV END =====`;

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
  if (config.jsonMode !== false) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...(config.extraHeaders ?? {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    ...(config.fetchInit ?? {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `OpenAI-compatible call failed: HTTP ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 500)}` : ''}`,
    );
  }

  const json = (await response.json()) as ChatCompletionResponse;
  if (json.error?.message) {
    throw new Error(`OpenAI-compatible error: ${json.error.message}`);
  }

  const raw = json.choices?.[0]?.message?.content ?? '';
  if (!raw) {
    throw new Error('OpenAI-compatible extractor: empty completion content');
  }

  const cleaned = BaseAIProvider.cleanJsonResponse(raw);
  return BaseAIProvider.parseJsonResponse(cleaned);
}
