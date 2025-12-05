import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { AIProviderFactory } from '@/lib/ai-providers';
import { decryptText } from '@/lib/encryption';

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
      const validationResult = await providerInstance.validateApiKey(
        apiKey,
        model,
      );

      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error:
            validationResult.error || `Invalid ${provider} API key or model`,
          provider,
          model,
        });
      }

      return NextResponse.json({
        isValid: true,
        message: `${provider} API key${model ? ` and model '${model}'` : ''} is valid`,
        provider,
        model,
      });
    } catch (validationError) {
      console.error(`Validation error for ${provider}:`, validationError);
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
    console.error('API key validation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
