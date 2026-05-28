import type { ICVBatchItem, ICVBatchPendingItem } from '@/lib/models/cvBatch';

export type RetryableFailedPendingItem = ICVBatchPendingItem;

type BatchRetrySource = {
  pendingItems?: ICVBatchPendingItem[];
  items?: ICVBatchItem[];
};

function itemKey(filename: string, fileUrl: string): string {
  return `${filename}\0${fileUrl}`;
}

function hasStoredFileUrl(item: ICVBatchPendingItem): boolean {
  return typeof item.file?.url === 'string' && item.file.url.length > 0;
}

/**
 * Resolves deferred/immediate batch files that can be retried (stored resume URL present).
 * Includes `pendingItems` marked failed, and failed `items` rows still backed by a pending row.
 */
export function collectRetryableFailedItems(
  batch: BatchRetrySource,
  filenameFilter?: string | null,
): RetryableFailedPendingItem[] {
  const result: RetryableFailedPendingItem[] = [];
  const seen = new Set<string>();

  const add = (item: ICVBatchPendingItem) => {
    if (filenameFilter && item.filename !== filenameFilter) {
      return;
    }
    if (!hasStoredFileUrl(item)) {
      return;
    }
    const key = itemKey(item.filename, item.file.url);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(item);
  };

  for (const item of batch.pendingItems ?? []) {
    if (item.status === 'failed') {
      add(item);
    }
  }

  const failedFilenames = new Set<string>();
  const items = batch.items ?? [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const row = items[index];
    if (row.status !== 'failed' || failedFilenames.has(row.filename)) {
      continue;
    }
    failedFilenames.add(row.filename);
    if (filenameFilter && row.filename !== filenameFilter) {
      continue;
    }
    if (result.some((entry) => entry.filename === row.filename)) {
      continue;
    }

    const pendingMatch = (batch.pendingItems ?? []).find(
      (pending) => pending.filename === row.filename && hasStoredFileUrl(pending),
    );
    if (pendingMatch) {
      add(pendingMatch);
    }
  }

  return result;
}

/** Match pending row for a retry target (failed or never-updated pending). */
export function findPendingItemIndexForRetry(
  pendingItems: ICVBatchPendingItem[],
  item: Pick<RetryableFailedPendingItem, 'filename' | 'file'>,
): number {
  return pendingItems.findIndex(
    (pending) =>
      pending.filename === item.filename
      && pending.file?.url === item.file?.url
      && (pending.status === 'failed' || pending.status === 'pending'),
  );
}
