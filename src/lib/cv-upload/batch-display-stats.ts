import type {
  CvBatchDetail,
  CvBatchSummary,
} from '@/lib/features/org/cvBatchTypes';
import { dedupeBatchItemsByFilename } from '@/lib/cv-upload/batch-item-dedupe';

export type CvBatchDisplayStatus = CvBatchSummary['status'];

export interface CvBatchDisplayCounts {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

type BatchStatsSource = Pick<CvBatchSummary, 'status' | 'processingMode'> & {
  totalFiles?: number;
  successCount?: number;
  failureCount?: number;
  items?: Array<{ filename: string; status: string }>;
  pendingItems?: Array<{ filename?: string; status: string }>;
};

function uniqueFilenamesFromBatch(batch: BatchStatsSource): Set<string> {
  const names = new Set<string>();
  for (const item of batch.items ?? []) {
    if (item.filename) {
      names.add(item.filename);
    }
  }
  for (const pending of batch.pendingItems ?? []) {
    if (pending.filename) {
      names.add(pending.filename);
    }
  }
  return names;
}

/** Counts derived from deduped line items (not stored batch counters). */
export function computeBatchDisplayCounts(batch: BatchStatsSource): CvBatchDisplayCounts {
  const deduped = dedupeBatchItemsByFilename(
    (batch.items ?? []).map((item) => ({
      filename: item.filename,
      status: item.status,
    })),
  );

  if (deduped.length > 0) {
    const success = deduped.filter((item) => item.status === 'success').length;
    const failed = deduped.filter((item) => item.status === 'failed').length;
    const pending = deduped.filter((item) => item.status === 'pending').length;
    const fromItems = deduped.length;
    const unionSize = uniqueFilenamesFromBatch(batch).size;
    return {
      total: Math.max(fromItems, unionSize, batch.totalFiles ?? 0),
      success,
      failed,
      pending,
    };
  }

  const pendingItems = batch.pendingItems ?? [];
  if (pendingItems.length > 0) {
    return {
      total: pendingItems.length,
      success: pendingItems.filter((item) => item.status === 'processed').length,
      failed: pendingItems.filter((item) => item.status === 'failed').length,
      pending: pendingItems.filter((item) => item.status === 'pending').length,
    };
  }

  return {
    total: batch.totalFiles ?? 0,
    success: batch.successCount ?? 0,
    failed: batch.failureCount ?? 0,
    pending: 0,
  };
}

/**
 * Status for UI: fixes stuck `processing` when all line items are terminal.
 */
export function deriveBatchDisplayStatus(batch: BatchStatsSource): CvBatchDisplayStatus {
  const counts = computeBatchDisplayCounts(batch);
  const hasDeferredPending = (batch.pendingItems ?? []).some(
    (item) => item.status === 'pending',
  );

  if (hasDeferredPending || counts.pending > 0) {
    if (batch.processingMode === 'deferred' || hasDeferredPending) {
      return 'pending';
    }
  }

  if (batch.status === 'processing') {
    const deduped = dedupeBatchItemsByFilename(batch.items ?? []);
    const hasTerminalWork = deduped.some(
      (item) => item.status === 'success' || item.status === 'failed',
    );
    const allTerminal =
      deduped.length > 0
      && deduped.every(
        (item) => item.status === 'success' || item.status === 'failed',
      );
    if (hasTerminalWork && allTerminal) {
      return 'completed';
    }
  }

  return batch.status;
}

export function getBatchDisplayCountsAndStatus(batch: BatchStatsSource): {
  counts: CvBatchDisplayCounts;
  displayStatus: CvBatchDisplayStatus;
} {
  return {
    counts: computeBatchDisplayCounts(batch),
    displayStatus: deriveBatchDisplayStatus(batch),
  };
}

/** Strip stale error text when a row is already successful (legacy DB rows). */
export function displayErrorForBatchFileRow(
  status: string,
  error?: string,
): string | undefined {
  if (status === 'success' || status === 'processed') {
    return undefined;
  }
  return error;
}

export function applyDisplayStatsToBatchDetail<T extends CvBatchDetail>(batch: T): T {
  const { counts, displayStatus } = getBatchDisplayCountsAndStatus(batch);
  return {
    ...batch,
    status: displayStatus,
    totalFiles: counts.total,
    successCount: counts.success,
    failureCount: counts.failed,
  };
}
