import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';
import {
  DEFAULT_CEREBRAS_RESUME_MODEL,
  DEFAULT_DEEPSEEK_RESUME_MODEL,
  DEFAULT_GROQ_RESUME_MODEL,
  DEFAULT_MISTRAL_RESUME_MODEL,
  DEFAULT_OPENROUTER_RESUME_MODEL,
} from '../config';
import { parsePdfToMarkdownViaDocling } from '../docling/parse-pdf-to-markdown';
import { extractResumeFromMarkdownWithGroq } from '../markdown-extractors/groq-markdown-extractor';
import { extractResumeFromMarkdownWithGemini } from '../markdown-extractors/gemini-markdown-extractor';
import { extractResumeFromMarkdownWithDeepseek } from '../markdown-extractors/deepseek-markdown-extractor';
import { extractResumeFromMarkdownWithOpenRouter } from '../markdown-extractors/openrouter-markdown-extractor';
import { extractResumeFromMarkdownWithCerebras } from '../markdown-extractors/cerebras-markdown-extractor';
import { extractResumeFromMarkdownWithMistral } from '../markdown-extractors/mistral-markdown-extractor';

export type BulkCvExtractorProvider = BulkCvProviderId;

export interface BulkCvProviderSlot {
  apiKey: string;
  model?: string;
}

export interface BulkCvOpenRouterSlot extends BulkCvProviderSlot {
  /** Optional OpenRouter "HTTP-Referer" / "X-Title" headers. */
  referer?: string;
  appTitle?: string;
}

export interface BulkCvResumePipelineOptions {
  provider: BulkCvExtractorProvider;
  doclingParseUrl: string;
  groq?: BulkCvProviderSlot;
  gemini?: BulkCvProviderSlot;
  deepseek?: BulkCvProviderSlot;
  openrouter?: BulkCvOpenRouterSlot;
  cerebras?: BulkCvProviderSlot;
  mistral?: BulkCvProviderSlot;
  fetchInit?: RequestInit;
}

function missingKeyError(label: string, hint: string): Error {
  return new Error(
    `${label} API key is not configured for bulk CV. ${hint}`,
  );
}

/**
 * Markdown → selected extractor → `ProcessedResumeData` (no Docling).
 * Used for server-side multi-provider fallback after a single PDF parse.
 */
export type BulkCvMarkdownExtractorOptions = Omit<
  BulkCvResumePipelineOptions,
  'doclingParseUrl'
>;

export async function extractBulkCvResumeFromMarkdown(
  markdown: string,
  options: BulkCvMarkdownExtractorOptions,
): Promise<ProcessedResumeData> {
  switch (options.provider) {
    case 'groq': {
      const apiKey = options.groq?.apiKey?.trim();
      if (!apiKey) {
        throw missingKeyError(
          'Groq',
          'Add it under Settings → Bulk CV AI (or set GROQ_API_KEY for development).',
        );
      }
      return extractResumeFromMarkdownWithGroq(markdown, {
        apiKey,
        model: options.groq?.model?.trim() || DEFAULT_GROQ_RESUME_MODEL,
      });
    }
    case 'gemini': {
      const apiKey = options.gemini?.apiKey?.trim();
      if (!apiKey) {
        throw missingKeyError(
          'Gemini',
          'Add it under Settings → Bulk CV AI.',
        );
      }
      return extractResumeFromMarkdownWithGemini(markdown, {
        apiKey,
        model: options.gemini?.model?.trim() || getDefaultModel('gemini'),
      });
    }
    case 'deepseek': {
      const apiKey = options.deepseek?.apiKey?.trim();
      if (!apiKey) {
        throw missingKeyError(
          'DeepSeek',
          'Add it under Settings → Bulk CV AI (or set DEEPSEEK_API_KEY).',
        );
      }
      return extractResumeFromMarkdownWithDeepseek(markdown, {
        apiKey,
        model:
          options.deepseek?.model?.trim() || DEFAULT_DEEPSEEK_RESUME_MODEL,
      });
    }
    case 'openrouter': {
      const apiKey = options.openrouter?.apiKey?.trim();
      if (!apiKey) {
        throw missingKeyError(
          'OpenRouter',
          'Add it under Settings → Bulk CV AI (or set OPENROUTER_API_KEY).',
        );
      }
      return extractResumeFromMarkdownWithOpenRouter(markdown, {
        apiKey,
        model:
          options.openrouter?.model?.trim() ||
          DEFAULT_OPENROUTER_RESUME_MODEL,
        referer: options.openrouter?.referer,
        appTitle: options.openrouter?.appTitle,
      });
    }
    case 'cerebras': {
      const apiKey = options.cerebras?.apiKey?.trim();
      if (!apiKey) {
        throw missingKeyError(
          'Cerebras',
          'Add it under Settings → Bulk CV AI (or set CEREBRAS_API_KEY).',
        );
      }
      return extractResumeFromMarkdownWithCerebras(markdown, {
        apiKey,
        model:
          options.cerebras?.model?.trim() || DEFAULT_CEREBRAS_RESUME_MODEL,
      });
    }
    case 'mistral': {
      const apiKey = options.mistral?.apiKey?.trim();
      if (!apiKey) {
        throw missingKeyError(
          'Mistral',
          'Add it under Settings → Bulk CV AI (or set MISTRAL_API_KEY).',
        );
      }
      return extractResumeFromMarkdownWithMistral(markdown, {
        apiKey,
        model: options.mistral?.model?.trim() || DEFAULT_MISTRAL_RESUME_MODEL,
      });
    }
    default: {
      const exhaustive: never = options.provider;
      throw new Error(`Unsupported bulk CV provider: ${String(exhaustive)}`);
    }
  }
}

/**
 * PDF → Docling (markdown) → selected extractor → `ProcessedResumeData`.
 *
 * Each extractor enforces its own contract (model id, JSON-mode handling).
 * Provider routing lives in `bulk-extract-from-request.ts`; new extractors
 * are added in `extractBulkCvResumeFromMarkdown` plus `BULK_CV_PROVIDER_IDS`.
 */
export async function runBulkCvResumePipeline(
  file: File,
  options: BulkCvResumePipelineOptions,
): Promise<ProcessedResumeData> {
  const markdown = await parsePdfToMarkdownViaDocling(
    file,
    options.doclingParseUrl,
    options.fetchInit,
  );
  return extractBulkCvResumeFromMarkdown(markdown, options);
}
