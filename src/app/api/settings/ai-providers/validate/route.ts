import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { AIProviderFactory } from '@/lib/ai-providers';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import {
  discoverGeminiModels,
  selectPreferredGeminiModel,
} from '@/lib/ai-providers/gemini-model-discovery';
import { logger } from '@/lib/logger/logger.server';
import { validateWithModelFallbacks } from '@/lib/ai-providers/validation-fallbacks';

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider, apiKey, model } = await req.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 },
      );
    }

    // The API key may be encrypted if it's coming from the database,
    // but for validation requests it should be plain text from the form
    // So we don't need to decrypt here as it's coming directly from user input
    const providerInstance = AIProviderFactory.getProvider(provider);

    try {
      if (provider === 'gemini') {
        const requestedModel =
          typeof model === 'string' ? model.trim() : undefined;
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

        const validationResult = await providerInstance.validateApiKey(
          apiKey,
          selectedModel,
        );

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

      const validationResult = await validateWithModelFallbacks({
        provider,
        providerLabel: provider,
        requestedModel: typeof model === 'string' ? model : undefined,
        validateModel: async (candidateModel) => {
          const result = await providerInstance.validateApiKey(
            apiKey,
            candidateModel,
          );

          return {
            error: result.error,
            ok: result.isValid,
          };
        },
      });

      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error:
            validationResult.error || `Invalid ${provider} API key or model`,
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
    } catch (validationError) {
      logger.error(
        `Validation error for ${provider} at ${req.url}`,
        validationError,
      );
      return NextResponse.json({
        isValid: false,
        error:
          validationError instanceof Error
            ? validationError.message
            : 'API key validation failed',
        provider,
        model,
      });
    }
  } catch (error) {
    logger.error(`API key validation error at ${req.url}`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
