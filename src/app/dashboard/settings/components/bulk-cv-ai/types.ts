import type { BulkCvProviderId, CvUploadPool } from '@/lib/types/bulk-cv-ai';

export type BulkCvAiFormValues = {
  cvUploadPool: CvUploadPool;
  doclingParseUrl: string;
  groq_api_key: string;
  groq_model: string;
  groq_custom_model: string;
  gemini_api_key: string;
  gemini_model: string;
  gemini_custom_model: string;
  deepseek_api_key: string;
  deepseek_model: string;
  deepseek_custom_model: string;
  openrouter_api_key: string;
  openrouter_model: string;
  openrouter_custom_model: string;
  cerebras_api_key: string;
  cerebras_model: string;
  cerebras_custom_model: string;
  mistral_api_key: string;
  mistral_model: string;
  mistral_custom_model: string;
};

/**
 * One row in the providers grid. Driving the form from this array means
 * adding a future provider is "add an entry + add to `BulkCvAiFormValues`".
 */
export interface BulkCvProviderFormField {
  id: BulkCvProviderId;
  label: string;
  apiKeyField: keyof BulkCvAiFormValues;
  modelField: keyof BulkCvAiFormValues;
  customModelField: keyof BulkCvAiFormValues;
  apiKeyPlaceholder: string;
  customModelPlaceholder: string;
}

export const BULK_CV_PROVIDER_FIELDS: ReadonlyArray<BulkCvProviderFormField> = [
  {
    id: 'groq',
    label: 'Groq',
    apiKeyField: 'groq_api_key',
    modelField: 'groq_model',
    customModelField: 'groq_custom_model',
    apiKeyPlaceholder: 'gsk_…',
    customModelPlaceholder: 'e.g. llama-3.1-8b-instant',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    apiKeyField: 'gemini_api_key',
    modelField: 'gemini_model',
    customModelField: 'gemini_custom_model',
    apiKeyPlaceholder: 'Google AI Studio key',
    customModelPlaceholder: 'e.g. gemini-1.5-flash',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiKeyField: 'deepseek_api_key',
    modelField: 'deepseek_model',
    customModelField: 'deepseek_custom_model',
    apiKeyPlaceholder: 'sk-… (DeepSeek API key)',
    customModelPlaceholder: 'e.g. deepseek-chat',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    apiKeyField: 'openrouter_api_key',
    modelField: 'openrouter_model',
    customModelField: 'openrouter_custom_model',
    apiKeyPlaceholder: 'sk-or-… (OpenRouter API key)',
    customModelPlaceholder: 'e.g. meta-llama/llama-3.1-8b-instruct:free',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    apiKeyField: 'cerebras_api_key',
    modelField: 'cerebras_model',
    customModelField: 'cerebras_custom_model',
    apiKeyPlaceholder: 'Cerebras Inference API key',
    customModelPlaceholder: 'e.g. llama3.1-8b',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    apiKeyField: 'mistral_api_key',
    modelField: 'mistral_model',
    customModelField: 'mistral_custom_model',
    apiKeyPlaceholder: 'Mistral API key (console.mistral.ai)',
    customModelPlaceholder: 'e.g. mistral-small-latest',
  },
];
