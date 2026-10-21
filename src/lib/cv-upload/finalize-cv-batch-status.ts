import type { ICVBatchItem, ICVBatchPendingItem } from '@/lib/models/cvBatch';
import { deriveBatchDisplayStatus } from '@/lib/cv-upload/batch-display-stats';

type BatchWithPendingItems = {
  items?: ICVBatchItem[];
  pendingItems?: ICVBatchPendingItem[];
  processingMode?: 'immediate' | 'deferred';
  totalFiles?: number;
  successCount?: number;
  failureCount?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: Date;
  save: () => Promise<unknown>;
};

/**
 * Sets batch status to `pending` when deferred files remain, otherwise `completed`.
 * Treats stuck `processing` as `completed` when all line items are terminal.
 */
export async function finalizeCvBatchStatus(batch: BatchWithPendingItems): Promise<void> {
  const displayStatus = deriveBatchDisplayStatus(batch);
  batch.status = displayStatus;
  batch.completedAt =
    displayStatus === 'completed' || displayStatus === 'failed'
      ? batch.completedAt ?? new Date()
      : undefined;
  await batch.save();
}
