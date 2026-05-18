import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { AIProviderFactory } from '@/lib/ai-providers';
import { logger } from '@/lib/logger/logger.server';
import {
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

    if (provider === 'gemini') {
      const gemini = AIProviderFactory.getProvider('gemini');
      const validationResult = await gemini.validateApiKey(apiKey, model);
      if (!validationResult.isValid) {
        return NextResponse.json({
          isValid: false,
          error:
            validationResult.error || 'Invalid Gemini API key or model',
          provider,
          model,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: 'Gemini API key is valid',
        provider,
        model,
      });
    }

    if (provider === 'groq') {
      const groqModel = model?.trim() || DEFAULT_GROQ_RESUME_MODEL;
      const groq = new Groq({ apiKey });
      await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'ping' }],
        model: groqModel,
        max_tokens: 1,
        temperature: 0,
      });
      return NextResponse.json({
        isValid: true,
        message: 'Groq API key is valid',
        provider,
        model: groqModel,
      });
    }

    if (provider === 'deepseek') {
      const deepseekModel = model?.trim() || DEFAULT_DEEPSEEK_RESUME_MODEL;
      const result = await probeOpenAICompatibleKey({
        baseUrl: DEEPSEEK_API_BASE_URL,
        apiKey,
        model: deepseekModel,
      });
      if (!result.ok) {
        return NextResponse.json({
          isValid: false,
          error: result.error || 'Invalid DeepSeek API key or model',
          provider,
          model: deepseekModel,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: 'DeepSeek API key is valid',
        provider,
        model: deepseekModel,
      });
    }

    if (provider === 'openrouter') {
      const openrouterModel =
        model?.trim() || DEFAULT_OPENROUTER_RESUME_MODEL;
      const result = await probeOpenAICompatibleKey({
        baseUrl: OPENROUTER_API_BASE_URL,
        apiKey,
        model: openrouterModel,
        extraHeaders: {
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER?.trim() || 'https://hiretrack',
          'X-Title':
            process.env.OPENROUTER_APP_TITLE?.trim() || 'HireTrack Bulk CV',
        },
      });
      if (!result.ok) {
        return NextResponse.json({
          isValid: false,
          error: result.error || 'Invalid OpenRouter API key or model',
          provider,
          model: openrouterModel,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: 'OpenRouter API key is valid',
        provider,
        model: openrouterModel,
      });
    }

    if (provider === 'cerebras') {
      const cerebrasModel = model?.trim() || DEFAULT_CEREBRAS_RESUME_MODEL;
      const result = await probeOpenAICompatibleKey({
        baseUrl: CEREBRAS_API_BASE_URL,
        apiKey,
        model: cerebrasModel,
      });
      if (!result.ok) {
        return NextResponse.json({
          isValid: false,
          error: result.error || 'Invalid Cerebras API key or model',
          provider,
          model: cerebrasModel,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: 'Cerebras API key is valid',
        provider,
        model: cerebrasModel,
      });
    }

    if (provider === 'mistral') {
      const mistralModel = model?.trim() || DEFAULT_MISTRAL_RESUME_MODEL;
      const result = await probeOpenAICompatibleKey({
        baseUrl: MISTRAL_API_BASE_URL,
        apiKey,
        model: mistralModel,
      });
      if (!result.ok) {
        return NextResponse.json({
          isValid: false,
          error: result.error || 'Invalid Mistral API key or model',
          provider,
          model: mistralModel,
        });
      }
      return NextResponse.json({
        isValid: true,
        message: 'Mistral API key is valid',
        provider,
        model: mistralModel,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported provider' },
      { status: 400 },
    );
  } catch (error) {
    logger.error({ error, url: req.url }, 'Bulk CV AI validate error');
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
