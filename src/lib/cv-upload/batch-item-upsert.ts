import type { Types } from 'mongoose';
import type { ICVBatchItem } from '@/lib/models/cvBatch';
import type { BatchItemParseFields } from '@/lib/cv-processing/batch-item-parse-fields';

type BatchItemStatus = ICVBatchItem['status'];

export interface CvBatchItemsMutable {
  items: ICVBatchItem[];
  successCount: number;
  failureCount: number;
}

/** Latest array index for `filename`, or -1. */
export function findLatestBatchItemIndexByFilename(
  items: ICVBatchItem[],
  filename: string,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].filename === filename) {
      return index;
    }
  }
  return -1;
}

/** Prefer pending, then failed, then latest row for the same filename. */
function pickCanonicalItemIndex(
  items: ICVBatchItem[],
  filename: string,
): number {
  const indices: number[] = [];
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].filename === filename) {
      indices.push(index);
    }
  }
  if (indices.length === 0) {
    return -1;
  }

  const pendingIndex = indices.find((i) => items[i].status === 'pending');
  if (pendingIndex !== undefined) {
    return pendingIndex;
  }

  const failedIndex = indices.find((i) => items[i].status === 'failed');
  if (failedIndex !== undefined) {
    return failedIndex;
  }

  return indices[indices.length - 1];
}

function adjustBatchCountsForStatusChange(
  batch: CvBatchItemsMutable,
  from: BatchItemStatus,
  to: BatchItemStatus,
): void {
  if (from === to) {
    return;
  }
  if (from === 'success') {
    batch.successCount = Math.max(0, batch.successCount - 1);
  } else if (from === 'failed') {
    batch.failureCount = Math.max(0, batch.failureCount - 1);
  }

  if (to === 'success') {
    batch.successCount += 1;
  } else if (to === 'failed') {
    batch.failureCount += 1;
  }
}

/** Remove duplicate rows for the same filename, keeping `keepIndex`. */
function removeDuplicateFilenameRows(
  batch: CvBatchItemsMutable,
  filename: string,
  keepIndex: number,
): void {
  for (let index = batch.items.length - 1; index >= 0; index -= 1) {
    if (index === keepIndex) {
      continue;
    }
    if (batch.items[index].filename !== filename) {
      continue;
    }
    const removedStatus = batch.items[index].status;
    if (removedStatus === 'success') {
      batch.successCount = Math.max(0, batch.successCount - 1);
    } else if (removedStatus === 'failed') {
      batch.failureCount = Math.max(0, batch.failureCount - 1);
    }
    batch.items.splice(index, 1);
    if (index < keepIndex) {
      keepIndex -= 1;
    }
  }
}

/**
 * One row per filename: update the canonical item or append. Removes older duplicates.
 */
export function upsertBatchItemSuccess(
  batch: CvBatchItemsMutable,
  params: {
    filename: string;
    candidateId: Types.ObjectId;
    parseFields: BatchItemParseFields;
    message?: string;
  },
): void {
  const { filename, candidateId, parseFields, message } = params;
  const successMessage =
    message ?? `Successfully processed via ${parseFields.parseProviderLabel}`;

  const targetIndex = pickCanonicalItemIndex(batch.items, filename);

  if (targetIndex >= 0) {
    const previousStatus = batch.items[targetIndex].status;
    const item = batch.items[targetIndex];
    item.status = 'success';
    item.candidateId = candidateId;
    item.message = successMessage;
    item.processedAt = new Date();
    item.error = undefined;
    item.cvParseMode = parseFields.cvParseMode;
    item.usedProvider = parseFields.usedProvider;
    item.parseProviderLabel = parseFields.parseProviderLabel;
    adjustBatchCountsForStatusChange(batch, previousStatus, 'success');
    removeDuplicateFilenameRows(batch, filename, targetIndex);
    return;
  }

  batch.items.push({
    filename,
    candidateId,
    status: 'success',
    message: successMessage,
    processedAt: new Date(),
    cvParseMode: parseFields.cvParseMode,
    usedProvider: parseFields.usedProvider,
    parseProviderLabel: parseFields.parseProviderLabel,
  });
  batch.successCount += 1;
}

export function upsertBatchItemFailure(
  batch: CvBatchItemsMutable,
  params: {
    filename: string;
    error: string;
    parseFields: BatchItemParseFields;
    message?: string;
  },
): void {
  const { filename, error, parseFields, message } = params;
  const targetIndex = pickCanonicalItemIndex(batch.items, filename);

  if (targetIndex >= 0) {
    const previousStatus = batch.items[targetIndex].status;
    const item = batch.items[targetIndex];
    item.status = 'failed';
    item.error = error;
    item.message = message;
    item.processedAt = new Date();
    item.candidateId = undefined;
    item.cvParseMode = parseFields.cvParseMode;
    item.usedProvider = parseFields.usedProvider;
    item.parseProviderLabel = parseFields.parseProviderLabel;
    adjustBatchCountsForStatusChange(batch, previousStatus, 'failed');
    removeDuplicateFilenameRows(batch, filename, targetIndex);
    return;
  }

  batch.items.push({
    filename,
    status: 'failed',
    error,
    processedAt: new Date(),
    cvParseMode: parseFields.cvParseMode,
    usedProvider: parseFields.usedProvider,
    parseProviderLabel: parseFields.parseProviderLabel,
    message,
  });
  batch.failureCount += 1;
}
