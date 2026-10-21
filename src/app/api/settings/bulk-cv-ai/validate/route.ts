import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { AIProviderFactory } from '@/lib/ai-providers';
import { logger } from '@/lib/logger/logger.server';
import {
  BULK_CV_PROVIDER_LABELS,
  CEREBRAS_API_BASE_URL,
  DEEPSEEK_API_BASE_URL,
  DEFAULT_CEREBRAS_RESUME_MODEL,
  DEFAULT_DEEPSEEK_RESUME_MODEL,
  DEFAULT_GROQ_RESUME_MODEL,
  DEFAULT_MISTRAL_RESUME_MODEL,
  DEFAULT_OPENROUTER_RESUME_MODEL,
  MISTRAL_API_BASE_URL,
  OPENROUTER_API_BASE_URL,
} from '@/lib/cv-processing/config';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import {
  discoverGeminiModels,
  selectPreferredGeminiModel,
} from '@/lib/ai-providers/gemini-model-discovery';
import { validateWithModelFallbacks } from '@/lib/ai-providers/validation-fallbacks';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';

type BulkValidateProvider = BulkCvProviderId;

interface ValidateBody {
  provider?: BulkValidateProvider;
  apiKey?: string;
  model?: string;
}

/**
 * Minimal "is this key live" probe against an OpenAI-compatible Chat
 * Completions endpoint. We deliberately ask for `max_tokens: 1` to keep
 * cost / quota usage trivial while still exercising auth + model id.
 */
async function probeOpenAICompatibleKey(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const url = `${opts.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
        ...(opts.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 1,
        temperature: 0,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }

  if (response.ok) return { ok: true };

  const bodyText = await response.text().catch(() => '');
  let message = `HTTP ${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string } | string;
    };
    if (typeof parsed.error === 'string') {
      message = parsed.error;
    } else if (parsed.error?.message) {
      message = parsed.error.message;
    }
  } catch {
    if (bodyText) message = bodyText.slice(0, 500);
  }
  return { ok: false, error: message, status: response.status };
}

async function validateOpenAICompatibleProvider(params: {
  apiKey: string;
  baseUrl: string;
  extraHeaders?: Record<string, string>;
  provider: BulkValidateProvider;
  requestedModel?: string;
}) {
  return validateWithModelFallbacks({
    provider: params.provider,
    providerLabel:
      BULK_CV_PROVIDER_LABELS[params.provider] ?? params.provider,
    requestedModel: params.requestedModel,
    validateModel: async (candidateModel) => {
      const result = await probeOpenAICompatibleKey({
        baseUrl: params.baseUrl,
        apiKey: params.apiKey,
        model: candidateModel,
        extraHeaders: params.extraHeaders,
      });

      return {
        error: result.ok ? undefined : result.error,
        ok: result.ok,
        status: result.ok ? undefined : result.status,
      };
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider, apiKey, model } = (await req.json()) as ValidateBody;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 },
      );
    }

    const providerLabel = BULK_CV_PROVIDER_LABELS[provider] ?? provider;

    if (provider === 'gemini') {
      const gemini = AIProviderFactory.getProvider('gemini');
      const requestedModel = model?.trim();
      const discoveredModelsResult = await discoverGeminiModels(apiKey);

      if (!discoveredModelsResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: discoveredModelsResult.error || 'Invalid Gemini API key',
          provider,
          model: requestedModel,
        });
      }

      if (discoveredModelsResult.models.length === 0) {
        return NextResponse.json({
          isValid: false,
          error: 'No Gemini generateContent models are available for this API key',
          provider,
          model: requestedModel,
        });
      }

      const selectedModel = selectPreferredGeminiModel(
        discoveredModelsResult.models,
        requestedModel,
        getDefaultModel('gemini'),
      );

      if (!selectedModel) {
        return NextResponse.json({
          isValid: false,
          error: 'No compatible Gemini models were discovered',
          provider,
          model: requestedModel,
        });
      }

      const validationResult = await gemini.validateApiKey(apiKey, selectedModel);

      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: validationResult.error || 'Invalid Gemini API key or model',
          provider,
          model: selectedModel,
          requestedModel,
          availableModels: discoveredModelsResult.models,
        });
      }

      const usedFallback = Boolean(
        requestedModel && requestedModel !== selectedModel,
      );

      return NextResponse.json({
        isValid: true,
        message: usedFallback
          ? `Gemini API key is valid. '${requestedModel}' is not available for this key, so '${selectedModel}' was selected from the live Gemini catalog.`
          : 'Gemini API key is valid',
        provider,
        model: selectedModel,
        requestedModel,
        usedFallback,
        availableModels: discoveredModelsResult.models,
      });
    }

    if (provider === 'groq') {
      const groq = new Groq({ apiKey });
      const validationResult = await validateWithModelFallbacks({
        provider,
        providerLabel,
        requestedModel: model?.trim() || DEFAULT_GROQ_RESUME_MODEL,
        validateModel: async (candidateModel) => {
          try {
            await groq.chat.completions.create({
              messages: [{ role: 'user', content: 'ping' }],
              model: candidateModel,
              max_tokens: 1,
              temperature: 0,
            });

            return { ok: true };
          } catch (error) {
            return {
              error:
                error instanceof Error ? error.message : 'Groq validation failed',
              ok: false,
            };
          }
        },
      });

      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: validationResult.error || 'Invalid Groq API key or model',
          provider,
          model: validationResult.model,
          requestedModel: validationResult.requestedModel,
          usedFallback: validationResult.usedFallback,
        });
      }

      return NextResponse.json({
        isValid: true,
        message: validationResult.message,
        provider,
        model: validationResult.model,
        requestedModel: validationResult.requestedModel,
        usedFallback: validationResult.usedFallback,
      });
    }

    if (provider === 'deepseek') {
      const validationResult = await validateOpenAICompatibleProvider({
        apiKey,
        baseUrl: DEEPSEEK_API_BASE_URL,
        provider,
        requestedModel: model?.trim() || DEFAULT_DEEPSEEK_RESUME_MODEL,
      });
      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: validationResult.error || 'Invalid DeepSeek API key or model',
          provider,
          model: validationResult.model,
          requestedModel: validationResult.requestedModel,
          usedFallback: validationResult.usedFallback,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: validationResult.message,
        provider,
        model: validationResult.model,
        requestedModel: validationResult.requestedModel,
        usedFallback: validationResult.usedFallback,
      });
    }

    if (provider === 'openrouter') {
      const validationResult = await validateOpenAICompatibleProvider({
        apiKey,
        baseUrl: OPENROUTER_API_BASE_URL,
        extraHeaders: {
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER?.trim() || 'https://hiretrack',
          'X-Title':
            process.env.OPENROUTER_APP_TITLE?.trim() || 'HireTrack Bulk CV',
        },
        provider,
        requestedModel: model?.trim() || DEFAULT_OPENROUTER_RESUME_MODEL,
      });
      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: validationResult.error || 'Invalid OpenRouter API key or model',
          provider,
          model: validationResult.model,
          requestedModel: validationResult.requestedModel,
          usedFallback: validationResult.usedFallback,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: validationResult.message,
        provider,
        model: validationResult.model,
        requestedModel: validationResult.requestedModel,
        usedFallback: validationResult.usedFallback,
      });
    }

    if (provider === 'cerebras') {
      const validationResult = await validateOpenAICompatibleProvider({
        apiKey,
        baseUrl: CEREBRAS_API_BASE_URL,
        provider,
        requestedModel: model?.trim() || DEFAULT_CEREBRAS_RESUME_MODEL,
      });
      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: validationResult.error || 'Invalid Cerebras API key or model',
          provider,
          model: validationResult.model,
          requestedModel: validationResult.requestedModel,
          usedFallback: validationResult.usedFallback,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: validationResult.message,
        provider,
        model: validationResult.model,
        requestedModel: validationResult.requestedModel,
        usedFallback: validationResult.usedFallback,
      });
    }

    if (provider === 'mistral') {
      const validationResult = await validateOpenAICompatibleProvider({
        apiKey,
        baseUrl: MISTRAL_API_BASE_URL,
        provider,
        requestedModel: model?.trim() || DEFAULT_MISTRAL_RESUME_MODEL,
      });
      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error: validationResult.error || 'Invalid Mistral API key or model',
          provider,
          model: validationResult.model,
          requestedModel: validationResult.requestedModel,
          usedFallback: validationResult.usedFallback,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: validationResult.message,
        provider,
        model: validationResult.model,
        requestedModel: validationResult.requestedModel,
        usedFallback: validationResult.usedFallback,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported provider' },
      { status: 400 },
    );
  } catch (error) {
    logger.error(`Bulk CV AI validate error at ${req.url}`, error);
    return NextResponse.json(
      {
        isValid: false,
        error:
          error instanceof Error ? error.message : 'API key validation failed',
      },
      { status: 200 },
    );
  }
}
