import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import {
  decryptBulkCvAi,
  encryptBulkCvAi,
} from '@/lib/encryption';
import {
  normalizeCvUploadPool,
  type BulkCvProviderId,
  type IBulkCvAi,
  type IBulkCvAiProviderSlot,
} from '@/lib/types/bulk-cv-ai';
import type { UpdateBulkCvAiRequest } from '@/lib/features/settings/types/ai.types';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import {
  countBulkCvProvidersWithKeys,
  DEFAULT_CEREBRAS_RESUME_MODEL,
  DEFAULT_DEEPSEEK_RESUME_MODEL,
  DEFAULT_GROQ_RESUME_MODEL,
  DEFAULT_MISTRAL_RESUME_MODEL,
  DEFAULT_OPENROUTER_RESUME_MODEL,
  MIN_BULK_CV_PROVIDERS_CONFIGURED,
} from '@/lib/cv-processing/config';

function emptySlot(model: string): IBulkCvAiProviderSlot {
  return { api_key: '', model, customModel: '' };
}

function defaultBulkCvAiResponse(): IBulkCvAi {
  return {
    cvUploadPool: 'bulk',
    doclingParseUrl: '',
    groq: emptySlot(DEFAULT_GROQ_RESUME_MODEL),
    gemini: emptySlot(getDefaultModel('gemini')),
    deepseek: emptySlot(DEFAULT_DEEPSEEK_RESUME_MODEL),
    openrouter: emptySlot(DEFAULT_OPENROUTER_RESUME_MODEL),
    cerebras: emptySlot(DEFAULT_CEREBRAS_RESUME_MODEL),
    mistral: emptySlot(DEFAULT_MISTRAL_RESUME_MODEL),
  };
}

function mergeSlot(
  stored: IBulkCvAiProviderSlot | undefined,
  base: IBulkCvAiProviderSlot,
): IBulkCvAiProviderSlot {
  return {
    api_key: stored?.api_key ?? '',
    model: stored?.model || base.model,
    customModel: stored?.customModel ?? '',
  };
}

function mergeBulkCvAi(stored: IBulkCvAi | undefined): IBulkCvAi {
  const base = defaultBulkCvAiResponse();
  if (!stored) return base;
  return {
    cvUploadPool: normalizeCvUploadPool(stored.cvUploadPool),
    doclingParseUrl: stored.doclingParseUrl ?? '',
    groq: mergeSlot(stored.groq, base.groq),
    gemini: mergeSlot(stored.gemini, base.gemini),
    deepseek: mergeSlot(stored.deepseek, base.deepseek),
    openrouter: mergeSlot(stored.openrouter, base.openrouter),
    cerebras: mergeSlot(stored.cerebras, base.cerebras),
    mistral: mergeSlot(stored.mistral, base.mistral),
  };
}

/**
 * Map of `retain*` flags to slot id. Keeping this here (and only here) means
 * adding a new slot is one entry instead of a fresh `if` block.
 */
const RETAIN_FLAGS = [
  { slotId: 'groq', flag: 'retainGroqApiKey' },
  { slotId: 'gemini', flag: 'retainGeminiApiKey' },
  { slotId: 'deepseek', flag: 'retainDeepseekApiKey' },
  { slotId: 'openrouter', flag: 'retainOpenrouterApiKey' },
  { slotId: 'cerebras', flag: 'retainCerebrasApiKey' },
  { slotId: 'mistral', flag: 'retainMistralApiKey' },
] as const satisfies ReadonlyArray<{
  slotId: BulkCvProviderId;
  flag: keyof UpdateBulkCvAiRequest;
}>;

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, 'admin');
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    const settings = await Settings.findOne({ organizationId })
      .select('bulkCvAi')
      .lean()
      .exec();

    const raw = settings?.bulkCvAi as IBulkCvAi | undefined;
    const decrypted = raw
      ? decryptBulkCvAi(raw, organizationId)
      : undefined;
    const merged = mergeBulkCvAi(decrypted ?? undefined);

    return NextResponse.json({ bulkCvAi: merged });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const [userData, body] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      req.json() as Promise<UpdateBulkCvAiRequest>,
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = userData.organizationId || '';

    if (!Settings) {
      return NextResponse.json(
        { error: 'Settings Model Not Found' },
        { status: 404 },
      );
    }

    if (!body?.bulkCvAi) {
      return NextResponse.json(
        { error: 'bulkCvAi payload is required' },
        { status: 400 },
      );
    }

    const existingRow = await Settings.findOne({ organizationId })
      .select('bulkCvAi')
      .lean()
      .exec();

    const existingDecrypted = decryptBulkCvAi(
      existingRow?.bulkCvAi as IBulkCvAi | undefined,
      organizationId,
    );

    const merged = mergeBulkCvAi(body.bulkCvAi);

    // Retain previously-stored keys when the form did not edit that password
    // field (the client only sets `retain*ApiKey` for clean fields). Keeps
    // saving Gemini from silently wiping Groq, etc.
    for (const { slotId, flag } of RETAIN_FLAGS) {
      const shouldRetain = Boolean(body[flag]);
      const currentValue = merged[slotId]?.api_key?.trim();
      const previousValue = existingDecrypted?.[slotId]?.api_key?.trim();
      if (shouldRetain && !currentValue && previousValue) {
        merged[slotId] = {
          ...merged[slotId],
          api_key: previousValue,
        };
      }
    }

    merged.cvUploadPool = normalizeCvUploadPool(merged.cvUploadPool);

    const configuredCount = countBulkCvProvidersWithKeys(merged);
    if (
      merged.cvUploadPool === 'bulk' &&
      configuredCount < MIN_BULK_CV_PROVIDERS_CONFIGURED
    ) {
      return NextResponse.json(
        {
          error: `At least ${MIN_BULK_CV_PROVIDERS_CONFIGURED} provider keys are required when CV uploads use Multiple providers.`,
        },
        { status: 400 },
      );
    }

    const encrypted = encryptBulkCvAi(merged, organizationId);
    if (!encrypted) {
      return NextResponse.json(
        { error: 'Failed to encrypt bulk CV AI settings' },
        { status: 500 },
      );
    }

    await Settings.findOneAndUpdate(
      { organizationId },
      { $set: { bulkCvAi: encrypted } },
      { new: true, runValidators: true, upsert: true },
    );

    return NextResponse.json({
      message: 'Bulk CV AI settings updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
