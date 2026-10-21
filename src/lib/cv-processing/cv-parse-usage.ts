import type { AIProviderType } from '@/lib/ai-providers/types';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';
import { BULK_CV_PROVIDER_LABELS, CV_PARSE_PATH_LABELS } from './config';
import type { CvParseMode } from './server/cv-parse-routing';

export interface CvParseUsageMetadata {
  cvParseMode: CvParseMode;
  /** Provider id: bulk slot id or premium `activeProvider`. */
  usedProvider: string;
}

const PREMIUM_PROVIDER_LABELS: Record<AIProviderType, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  perplexity: 'Perplexity',
};

export function formatCvParseProviderLabel(
  mode: CvParseMode,
  providerId: string,
): string {
  if (mode === 'bulk') {
    const id = providerId as BulkCvProviderId;
    return BULK_CV_PROVIDER_LABELS[id] ?? providerId;
  }
  const premiumId = providerId as AIProviderType;
  return PREMIUM_PROVIDER_LABELS[premiumId] ?? providerId;
}

export function formatCvParseUsageSummary(usage: CvParseUsageMetadata): string {
  const pathLabel = usage.cvParseMode === 'bulk' ? 'Bulk CV AI' : 'AI Providers';
  const providerLabel = formatCvParseProviderLabel(
    usage.cvParseMode,
    usage.usedProvider,
  );
  return `${pathLabel} · ${providerLabel}`;
}

export function batchItemFieldsFromParseUsage(usage: CvParseUsageMetadata): {
  cvParseMode: CvParseMode;
  usedProvider: string;
  parseProviderLabel: string;
} {
  return {
    cvParseMode: usage.cvParseMode,
    usedProvider: usage.usedProvider,
    parseProviderLabel: formatCvParseUsageSummary(usage),
  };
}

/** When every bulk provider in the rotation was tried and failed. */
export function batchItemFieldsFromBulkAttempts(
  attemptedProviderIds: string[],
): {
  cvParseMode: CvParseMode;
  usedProvider: string;
  parseProviderLabel: string;
} {
  const labels = attemptedProviderIds.map((id) =>
    formatCvParseProviderLabel('bulk', id),
  );
  const triedText =
    labels.length > 0 ? labels.join(', ') : 'bulk providers';
  return {
    cvParseMode: 'bulk',
    usedProvider: attemptedProviderIds[0] ?? '',
    parseProviderLabel: `${CV_PARSE_PATH_LABELS.bulk} · tried ${triedText}`,
  };
}
