export interface IBulkCvAiProviderSlot {
  api_key: string;
  model: string;
  customModel: string;
}

/**
 * IDs for bulk-CV-AI extractors.
 *
 * Add a new provider in three steps:
 *   1. Add the id here.
 *   2. Add a slot in `IBulkCvAi` below.
 *   3. Register it in `BULK_CV_PROVIDER_IDS`
 *      (see `src/lib/cv-processing/config.ts`).
 */
export type BulkCvProviderId =
  | 'groq'
  | 'gemini'
  | 'deepseek'
  | 'openrouter'
  | 'cerebras'
  | 'mistral';

/** Which CV upload parsing mode the org uses. No automatic switch between modes. */
export type CvUploadPool = 'bulk' | 'premium';

export function normalizeCvUploadPool(value: unknown): CvUploadPool {
  return value === 'premium' ? 'premium' : 'bulk';
}

export interface IBulkCvAi {
  /** Admin-selected CV upload parsing mode (multiple providers vs single main AI provider). */
  cvUploadPool?: CvUploadPool;
  doclingParseUrl: string;
  groq: IBulkCvAiProviderSlot;
  gemini: IBulkCvAiProviderSlot;
  deepseek: IBulkCvAiProviderSlot;
  openrouter: IBulkCvAiProviderSlot;
  cerebras: IBulkCvAiProviderSlot;
  mistral: IBulkCvAiProviderSlot;
}
