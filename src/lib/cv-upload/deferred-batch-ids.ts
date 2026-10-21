import type { CvBatchDetail, CvBatchSummary } from '@/lib/features/org/cvBatchTypes';

export function isDeferredPendingBatch(
  batch: Pick<CvBatchSummary, 'status' | 'processingMode'>,
): boolean {
  return batch.status === 'pending' && batch.processingMode === 'deferred';
}

/** IDs of deferred batches still waiting for server processing. */
export function collectPendingDeferredBatchIds(
  deferredBatches: CvBatchDetail[],
): string[] {
  return deferredBatches.filter(isDeferredPendingBatch).map((batch) => batch._id);
}

export function resolveDeferredBatchIdsToProcess(
  deferredBatches: CvBatchDetail[],
  options?: { batchId?: string; batchIds?: string[] },
): string[] {
  if (options?.batchIds && options.batchIds.length > 0) {
    return [...new Set(options.batchIds)];
  }
  if (options?.batchId) {
    return [options.batchId];
  }
  return collectPendingDeferredBatchIds(deferredBatches);
}
