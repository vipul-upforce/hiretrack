import { formatBatchItemParseLabel } from '@/lib/cv-processing/batch-item-parse-display';
import type { ProcessedItem } from './components/cv-batch-processor';

/** Label for one processed file (stored fields or legacy message text). */
export function resolveItemParseLabel(
  item: Pick<
    ProcessedItem,
    'parseProviderLabel' | 'message' | 'cvParseMode' | 'usedProvider'
  >,
): string | undefined {
  const fromFields = formatBatchItemParseLabel(item);
  if (fromFields) {
    return fromFields;
  }

  const message = item.message?.trim();
  if (!message) {
    return undefined;
  }

  const viaIndex = message.toLowerCase().lastIndexOf(' via ');
  if (viaIndex >= 0) {
    return message.slice(viaIndex + 5).trim();
  }
  return undefined;
}

/** Summary for upload toast (unique parsers across all processed files). */
export function summarizeBatchParseLabels(
  items: ProcessedItem[],
): string | null {
  const labels = items
    .map((item) => resolveItemParseLabel(item))
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return null;
  }

  const unique = [...new Set(labels)];
  if (unique.length <= 2) {
    return unique.join(' · ');
  }
  return `${unique[0]} +${unique.length - 1} more`;
}
