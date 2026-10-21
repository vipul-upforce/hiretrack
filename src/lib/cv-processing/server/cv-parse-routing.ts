import type { IAIProviders } from '@/lib/models/settings';
import type { AIProviders } from '@/lib/ai-providers/types';
import { decryptBulkCvAi, decryptProviderKeys, ProvidersConfig } from '@/lib/encryption';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import {
  normalizeCvUploadPool,
  type CvUploadPool,
  type IBulkCvAi,
} from '@/lib/types/bulk-cv-ai';
import {
  buildBulkCvReadinessAndSlots,
  readyBulkCvProviders,
  type BulkCvProviderReadiness,
} from './bulk-resume-extract';

export type CvParseMode = 'bulk' | 'premium';

export interface CvParseRoutingSnapshot {
  /** Admin-selected parsing mode from Settings → Bulk CV AI. */
  cvUploadPool: CvUploadPool;
  cvParseMode: CvParseMode;
  bulkCvProviderReadiness: BulkCvProviderReadiness;
  bulkReadyCount: number;
  premiumReady: boolean;
  premiumActiveProvider?: AIProviders['activeProvider'];
}

function legacyAiProvidersFromSettings(
  settings: Pick<{ gemini?: { gemini_key?: string } }, 'gemini'>,
): IAIProviders {
  const legacyGeminiKey = settings.gemini?.gemini_key || '';
  return {
    activeProvider: 'gemini',
    gemini: {
      api_key: legacyGeminiKey,
      model: 'gemini-1.5-flash',
      customModel: '',
    },
    openai: {
      api_key: '',
      model: 'gpt-4o-mini',
      customModel: '',
    },
    anthropic: {
      api_key: '',
      model: 'claude-3-5-sonnet-20241022',
      customModel: '',
    },
    perplexity: {
      api_key: '',
      model: 'sonar-pro',
      customModel: '',
    },
  };
}

export function isPremiumCvParseReady(
  decryptedAiProviders: AIProviders,
): boolean {
  const { activeProvider } = decryptedAiProviders;
  return Boolean(decryptedAiProviders[activeProvider]?.api_key?.trim());
}

export interface OrgCvParseContext {
  cvUploadPool: CvUploadPool;
  cvParseMode: CvParseMode;
  bulkCvAi: IBulkCvAi | null | undefined;
  decryptedAiProviders: AIProviders;
  routing: CvParseRoutingSnapshot;
}

type SettingsCvParseSlice = {
  bulkCvAi?: IBulkCvAi;
  aiProviders?: IAIProviders | AIProviders;
  gemini?: { gemini_key?: string };
};

export function buildOrgCvParseContextFromSettings(
  organizationId: string,
  settings: SettingsCvParseSlice,
): OrgCvParseContext {
  const bulkCvAi = decryptBulkCvAi(
    settings.bulkCvAi as IBulkCvAi | undefined,
    organizationId,
  );

  let aiProvider = settings.aiProviders as IAIProviders | AIProviders | undefined;
  if (!aiProvider) {
    aiProvider = legacyAiProvidersFromSettings(settings);
  }

  const decryptedAiProviders = decryptProviderKeys(
    aiProvider as ProvidersConfig,
    organizationId,
  ) as AIProviders;

  const { readiness } = buildBulkCvReadinessAndSlots(bulkCvAi);
  const bulkReadyCount = readyBulkCvProviders(readiness).length;
  const premiumReady = isPremiumCvParseReady(decryptedAiProviders);
  const cvUploadPool = normalizeCvUploadPool(bulkCvAi?.cvUploadPool);

  let cvParseMode: CvParseMode;
  if (cvUploadPool === 'bulk') {
    if (bulkReadyCount === 0) {
      throw new Error(
        'Multiple providers option is selected in Settings → Bulk CV AI, but no provider keys are configured. Add at least 2 keys below or switch to Main AI provider (single).',
      );
    }
    cvParseMode = 'bulk';
  } else if (premiumReady) {
    cvParseMode = 'premium';
  } else {
      throw new Error(
        'Main AI provider (single) is selected in Settings → Bulk CV AI, but Settings → AI Providers has no active API key. Configure a provider there or switch to Multiple providers.',
      );
  }

  const routing: CvParseRoutingSnapshot = {
    cvUploadPool,
    cvParseMode,
    bulkCvProviderReadiness: readiness,
    bulkReadyCount,
    premiumReady,
    premiumActiveProvider: decryptedAiProviders.activeProvider,
  };

  return {
    cvUploadPool,
    cvParseMode,
    bulkCvAi,
    decryptedAiProviders,
    routing,
  };
}

export async function loadOrgCvParseContext(
  organizationId: string,
): Promise<OrgCvParseContext> {
  await connectToDatabase();
  if (!Settings) {
    throw new Error('Settings model not available');
  }

  const settings = await Settings.findOne({ organizationId })
    .select('bulkCvAi aiProviders gemini')
    .lean()
    .exec();

  if (!settings) {
    throw new Error('Settings not found');
  }

  return buildOrgCvParseContextFromSettings(organizationId, settings);
}

export async function getCvParseRoutingForOrganization(
  organizationId: string,
): Promise<CvParseRoutingSnapshot> {
  const ctx = await loadOrgCvParseContext(organizationId);
  return ctx.routing;
}
