import { AIProviderType } from '@/lib/ai-providers';

export interface AIProvidersValues {
  activeProvider: AIProviderType;
  gemini_api_key: string;
  gemini_model: string;
  gemini_custom_model: string;
  openai_api_key: string;
  openai_model: string;
  openai_custom_model: string;
  anthropic_api_key: string;
  anthropic_model: string;
  anthropic_custom_model: string;
  perplexity_api_key: string;
  perplexity_model: string;
  perplexity_custom_model: string;
}

export type FormFieldName = keyof Omit<AIProvidersValues, 'activeProvider'>;

export interface VerificationState {
  status: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  messages: Record<string, string>;
}

export interface ProviderConfigItem {
  label: string;
  apiKeyField: FormFieldName;
  modelField: FormFieldName;
  customModelField: FormFieldName;
  placeholder: string;
  provider: AIProviderType;
  description: string;
}
