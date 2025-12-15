import { ProviderConfigItem } from './types';

export const PROVIDER_CONFIGS: ProviderConfigItem[] = [
  {
    label: 'Google Gemini',
    apiKeyField: 'gemini_api_key',
    modelField: 'gemini_model',
    customModelField: 'gemini_custom_model',
    placeholder: 'Enter your Gemini API key',
    provider: 'gemini',
    description:
      "Google's multimodal AI model with excellent vision capabilities",
  },
  {
    label: 'OpenAI GPT',
    apiKeyField: 'openai_api_key',
    modelField: 'openai_model',
    customModelField: 'openai_custom_model',
    placeholder: 'Enter your OpenAI API key',
    provider: 'openai',
    description: "OpenAI's powerful language models for text processing",
  },
  {
    label: 'Anthropic Claude',
    apiKeyField: 'anthropic_api_key',
    modelField: 'anthropic_model',
    customModelField: 'anthropic_custom_model',
    placeholder: 'Enter your Anthropic API key',
    provider: 'anthropic',
    description: "Anthropic's Claude AI for detailed analysis and reasoning",
  },
  {
    label: 'Perplexity AI',
    apiKeyField: 'perplexity_api_key',
    modelField: 'perplexity_model',
    customModelField: 'perplexity_custom_model',
    placeholder: 'Enter your Perplexity API key',
    provider: 'perplexity',
    description: "Perplexity's search-augmented language models",
  },
];
