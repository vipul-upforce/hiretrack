import type { ICVBatchPendingItem } from '@/lib/models/cvBatch';

type BatchWithPendingItems = {
  pendingItems?: ICVBatchPendingItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: Date;
  save: () => Promise<unknown>;
};

/**
 * Sets batch status to `pending` when deferred files remain, otherwise `completed`.
 */
export async function finalizeCvBatchStatus(batch: BatchWithPendingItems): Promise<void> {
  const hasDeferredPending = (batch.pendingItems ?? []).some(
    (item) => item.status === 'pending',
  );
  batch.status = hasDeferredPending ? 'pending' : 'completed';
  batch.completedAt = hasDeferredPending ? undefined : new Date();
  await batch.save();
}
