import { getDefaultModel } from './models-config';

type ValidationAttempt = {
  error?: string;
  ok: boolean;
  status?: number;
};

type ValidateWithFallbacksParams = {
  provider: string;
  providerLabel: string;
  requestedModel?: string;
  validateModel: (model: string) => Promise<ValidationAttempt>;
};

type ValidateWithFallbacksResult =
  | {
      isValid: true;
      message: string;
      model: string;
      requestedModel?: string;
      usedFallback: boolean;
    }
  | {
      isValid: false;
      error: string;
      model: string;
      requestedModel?: string;
      usedFallback: false;
    };

const MODEL_NOT_FOUND_PATTERNS = [
  /model.+not found/i,
  /model_not_found/i,
  /does not exist/i,
  /unknown model/i,
  /invalid model/i,
  /unsupported model/i,
  /unrecognized model/i,
  /no endpoints found/i,
  /not a valid model/i,
  /cannot find model/i,
] as const;

const PROVIDER_VALIDATION_FALLBACKS: Record<string, readonly string[]> = {
  anthropic: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
  cerebras: ['llama3.1-8b'],
  deepseek: ['deepseek-chat'],
  gemini: ['gemini-1.5-flash', 'gemini-2.5-flash-lite'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  mistral: ['mistral-small-latest'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  openrouter: [
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-2-9b-it:free',
    'openai/gpt-4o-mini',
  ],
  perplexity: ['sonar-pro'],
};

function isModelLookupFailure(attempt: ValidationAttempt): boolean {
  if (!attempt.error) {
    return false;
  }

  const normalizedError = attempt.error.trim();

  return MODEL_NOT_FOUND_PATTERNS.some((pattern) =>
    pattern.test(normalizedError),
  );
}

function getFallbackModels(provider: string, requestedModel?: string): string[] {
  const trimmedRequestedModel = requestedModel?.trim();
  const candidates = new Set<string>();
  const defaultModel = getDefaultModel(provider);

  if (defaultModel) {
    candidates.add(defaultModel);
  }

  for (const fallbackModel of PROVIDER_VALIDATION_FALLBACKS[provider] ?? []) {
    if (fallbackModel) {
      candidates.add(fallbackModel);
    }
  }

  return Array.from(candidates).filter(
    (candidate) => candidate && candidate !== trimmedRequestedModel,
  );
}

function buildSuccessMessage(
  providerLabel: string,
  requestedModel: string | undefined,
  validatedModel: string,
): string {
  const trimmedRequestedModel = requestedModel?.trim();

  if (trimmedRequestedModel && trimmedRequestedModel !== validatedModel) {
    return `${providerLabel} API key is valid. '${trimmedRequestedModel}' was unavailable, so verification used '${validatedModel}' instead.`;
  }

  return `${providerLabel} API key is valid`;
}

export async function validateWithModelFallbacks({
  provider,
  providerLabel,
  requestedModel,
  validateModel,
}: ValidateWithFallbacksParams): Promise<ValidateWithFallbacksResult> {
  const initialModel = requestedModel?.trim() || getDefaultModel(provider);
  const initialAttempt = await validateModel(initialModel);

  if (initialAttempt.ok) {
    return {
      isValid: true,
      message: buildSuccessMessage(providerLabel, requestedModel, initialModel),
      model: initialModel,
      requestedModel: requestedModel?.trim() || undefined,
      usedFallback: false,
    };
  }

  if (!isModelLookupFailure(initialAttempt)) {
    return {
      isValid: false,
      error: initialAttempt.error || 'API key validation failed',
      model: initialModel,
      requestedModel: requestedModel?.trim() || undefined,
      usedFallback: false,
    };
  }

  let lastFailure = initialAttempt;

  for (const fallbackModel of getFallbackModels(provider, initialModel)) {
    const fallbackAttempt = await validateModel(fallbackModel);

    if (fallbackAttempt.ok) {
      return {
        isValid: true,
        message: buildSuccessMessage(
          providerLabel,
          requestedModel || initialModel,
          fallbackModel,
        ),
        model: fallbackModel,
        requestedModel: requestedModel?.trim() || initialModel,
        usedFallback: true,
      };
    }

    lastFailure = fallbackAttempt;

    if (!isModelLookupFailure(fallbackAttempt)) {
      break;
    }
  }

  return {
    isValid: false,
    error: lastFailure.error || initialAttempt.error || 'API key validation failed',
    model: initialModel,
    requestedModel: requestedModel?.trim() || undefined,
    usedFallback: false,
  };
}
