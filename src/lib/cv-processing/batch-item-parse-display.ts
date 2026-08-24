import {
  formatCvParseUsageSummary,
  type CvParseUsageMetadata,
} from './cv-parse-usage';

/** Build display label from stored batch item fields (safe for client components). */
export function formatBatchItemParseLabel(
  item: {
    parseProviderLabel?: string;
    cvParseMode?: CvParseUsageMetadata['cvParseMode'];
    usedProvider?: string;
  },
): string | undefined {
  const direct = item.parseProviderLabel?.trim();
  if (direct) {
    return direct;
  }

  if (item.cvParseMode && item.usedProvider?.trim()) {
    return formatCvParseUsageSummary({
      cvParseMode: item.cvParseMode,
      usedProvider: item.usedProvider.trim(),
    });
  }

  return undefined;
}
