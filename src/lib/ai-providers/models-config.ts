export interface ModelCapabilities {
  supportsPDF: boolean;
  supportsVision: boolean;
  supportsJSON: boolean;
  maxTokens: number;
  costTier: 'low' | 'medium' | 'high';
  description: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  capabilities: ModelCapabilities;
  isDefault?: boolean;
  isDeprecated?: boolean;
}

export interface ProviderModels {
  [key: string]: ModelInfo[];
}

export const AI_PROVIDER_MODELS: ProviderModels = {
  gemini: [
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      capabilities: {
        supportsPDF: true,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 1000000,
        costTier: 'low',
        description: 'Fast and efficient model, best for quick processing',
      },
      isDefault: true,
    },
    {
      id: 'gemini-1.5-flash-8b',
      name: 'Gemini 1.5 Flash 8B',
      capabilities: {
        supportsPDF: true,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 1000000,
        costTier: 'low',
        description: 'Smaller, faster version of Flash model',
      },
    },
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite",
      capabilities: {
        supportsPDF: true,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 1000000,
        costTier: "low",
        description: "Ultra-fast and lightweight 2.5 Flash Lite model"
      }
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      capabilities: {
        supportsPDF: true,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 2000000,
        costTier: 'high',
        description: 'Most capable model with best reasoning abilities',
      },
    },
    {
      id: 'gemini-1.0-pro',
      name: 'Gemini 1.0 Pro',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 30720,
        costTier: 'medium',
        description: 'Legacy model, text-only',
      },
      isDeprecated: true,
    },
  ],
  
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 128000,
        costTier: 'low',
        description: 'Affordable and intelligent small model for fast, lightweight tasks',
      },
      isDefault: true,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 128000,
        costTier: 'high',
        description: 'High-intelligence flagship model for complex, multi-step tasks',
      },
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 128000,
        costTier: 'high',
        description: 'Previous generation flagship model',
      },
    },
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo Preview',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 128000,
        costTier: 'high',
        description: 'Preview version, text-only',
      },
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 16385,
        costTier: 'low',
        description: 'Fast, inexpensive model for simple tasks',
      },
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 200000,
        costTier: 'medium',
        description: 'Most intelligent model, balanced performance and speed',
      },
      isDefault: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 200000,
        costTier: 'low',
        description: 'Fastest model for lightweight tasks',
      },
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 200000,
        costTier: 'high',
        description: 'Most powerful model for highly complex tasks',
      },
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 200000,
        costTier: 'medium',
        description: 'Previous generation balanced model',
      },
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 200000,
        costTier: 'low',
        description: 'Previous generation fast model',
      },
    },
  ],
  perplexity: [
    {
      id: 'sonar-pro',
      name: 'Sonar Pro',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 28000,
        costTier: 'high',
        description: 'Most powerful model with enhanced context',
      },
      isDefault: true,
    },
  ],
  groq: [
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 8192,
        costTier: 'low',
        description: 'Fast Groq-hosted Llama for structured JSON extraction',
      },
      isDefault: true,
    },
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 32768,
        costTier: 'low',
        description: 'Higher quality Groq model when 8B is insufficient',
      },
    },
  ],
  deepseek: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat (V3)',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 64000,
        costTier: 'low',
        description:
          'Low-cost JSON-mode model. Use “Custom model id” for `deepseek-reasoner` (paid / balance required).',
      },
      isDefault: true,
    },
  ],
  openrouter: [
    {
      id: 'meta-llama/llama-3.1-8b-instruct:free',
      name: 'Llama 3.1 8B Instruct (Free)',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 8192,
        costTier: 'low',
        description: 'Free-tier Llama 3.1 instruct via OpenRouter',
      },
      isDefault: true,
    },
    {
      id: 'google/gemma-2-9b-it:free',
      name: 'Gemma 2 9B IT (Free)',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 8192,
        costTier: 'low',
        description: 'Free-tier Gemma 2 instruct-tuned via OpenRouter',
      },
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini (OpenRouter)',
      capabilities: {
        supportsPDF: false,
        supportsVision: true,
        supportsJSON: true,
        maxTokens: 128000,
        costTier: 'medium',
        description:
          'Generic OpenRouter fallback when rotating free-tier models are unavailable',
      },
    },
  ],
  cerebras: [
    {
      id: 'llama3.1-8b',
      name: 'Llama 3.1 8B (Cerebras)',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 8192,
        costTier: 'low',
        description: 'Fast Cerebras-hosted Llama; OpenAI-compatible API',
      },
      isDefault: true,
    },
  ],
  mistral: [
    {
      id: 'mistral-small-latest',
      name: 'Mistral Small (latest)',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 128000,
        costTier: 'low',
        description:
          'Mistral API; generous limits on the Experiment plan (see mistral.ai pricing).',
      },
      isDefault: true,
    },
    {
      id: 'open-mistral-nemo',
      name: 'Mistral Nemo (open weights)',
      capabilities: {
        supportsPDF: false,
        supportsVision: false,
        supportsJSON: true,
        maxTokens: 131000,
        costTier: 'low',
        description: '12B-class open model via Mistral API',
      },
    },
  ],
};

export const getDefaultModel = (provider: string): string => {
  const models = AI_PROVIDER_MODELS[provider];
  if (!models) return '';

  const defaultModel = models.find((model) => model.isDefault);
  return defaultModel?.id || models[0]?.id || '';
};

export const getModelInfo = (provider: string, modelId: string): ModelInfo | null => {
  const models = AI_PROVIDER_MODELS[provider];
  if (!models) return null;

  return models.find((model) => model.id === modelId) || null;
};

export const getProviderModels = (provider: string): ModelInfo[] => AI_PROVIDER_MODELS[provider] || [];

export const isModelSupported = (provider: string, modelId: string): boolean => {
  const models = AI_PROVIDER_MODELS[provider];
  if (!models) return false;

  return models.some((model) => model.id === modelId);
};

export const getModelCapabilities = (provider: string, modelId: string): ModelCapabilities | null => {
  const modelInfo = getModelInfo(provider, modelId);
  return modelInfo?.capabilities || null;
};
