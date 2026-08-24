export interface DiscoveredProviderModel {
  id: string;
  name: string;
}

interface GeminiListModelsResponse {
  models?: Array<{
    baseModelId?: string;
    displayName?: string;
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
}

function normalizeGeminiModelId(model: {
  baseModelId?: string;
  name?: string;
}): string | null {
  if (model.baseModelId?.trim()) {
    return model.baseModelId.trim();
  }

  if (model.name?.startsWith('models/')) {
    return model.name.replace(/^models\//, '').trim();
  }

  return model.name?.trim() || null;
}

function isGeminiGenerateContentModel(model: {
  supportedGenerationMethods?: string[];
}): boolean {
  return (model.supportedGenerationMethods ?? []).includes('generateContent');
}

export async function discoverGeminiModels(
  apiKey: string,
): Promise<
  | { isValid: true; models: DiscoveredProviderModel[] }
  | { isValid: false; error: string }
> {
  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      if (
        bodyText.includes('API_KEY_INVALID') ||
        bodyText.toLowerCase().includes('api key not valid') ||
        bodyText.toLowerCase().includes('permission denied')
      ) {
        return { isValid: false, error: 'Invalid API key' };
      }
    }

    return {
      isValid: false,
      error: bodyText || `HTTP ${response.status} ${response.statusText}`,
    };
  }

  let payload: GeminiListModelsResponse;

  try {
    payload = (await response.json()) as GeminiListModelsResponse;
  } catch {
    return {
      isValid: false,
      error: 'Could not parse Gemini models response',
    };
  }

  const discoveredModels = new Map<string, DiscoveredProviderModel>();

  for (const model of payload.models ?? []) {
    if (!isGeminiGenerateContentModel(model)) {
      continue;
    }

    const modelId = normalizeGeminiModelId(model);
    if (!modelId || !modelId.startsWith('gemini')) {
      continue;
    }

    discoveredModels.set(modelId, {
      id: modelId,
      name: model.displayName?.trim() || modelId,
    });
  }

  return {
    isValid: true,
    models: Array.from(discoveredModels.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  };
}

export function selectPreferredGeminiModel(
  models: DiscoveredProviderModel[],
  requestedModel?: string,
  fallbackModel?: string,
): string | null {
  const requestedModelId = requestedModel?.trim();
  const fallbackModelId = fallbackModel?.trim();

  if (requestedModelId && models.some((model) => model.id === requestedModelId)) {
    return requestedModelId;
  }

  if (fallbackModelId && models.some((model) => model.id === fallbackModelId)) {
    return fallbackModelId;
  }

  return models[0]?.id ?? null;
}
