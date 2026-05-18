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

export interface IBulkCvAi {
  doclingParseUrl: string;
  groq: IBulkCvAiProviderSlot;
  gemini: IBulkCvAiProviderSlot;
  deepseek: IBulkCvAiProviderSlot;
  openrouter: IBulkCvAiProviderSlot;
  cerebras: IBulkCvAiProviderSlot;
  mistral: IBulkCvAiProviderSlot;
}
