import {
  batchItemFieldsFromBulkAttempts,
  batchItemFieldsFromParseUsage,
  type CvParseUsageMetadata,
} from './cv-parse-usage';
import { buildBulkProviderAttemptOrder } from './server/bulk-resume-extract';
import type { OrgCvParseContext } from './server/cv-parse-routing';
import { batchItemParseFieldsFromProcessError } from './server/cv-resume-process-error';

export type BatchItemParseFields = ReturnType<typeof batchItemFieldsFromParseUsage>;

/** Parse fields from routing context when the error object lost typed metadata. */
export function batchItemParseFieldsFromContext(
  ctx: OrgCvParseContext,
  filename: string,
  fileSize = 0,
): BatchItemParseFields {
  if (ctx.cvParseMode === 'bulk') {
    const order = buildBulkProviderAttemptOrder(
      ctx.bulkCvAi,
      filename,
      fileSize,
    );
    return batchItemFieldsFromBulkAttempts(order);
  }

  return batchItemFieldsFromParseUsage({
    cvParseMode: 'premium',
    usedProvider: ctx.decryptedAiProviders.activeProvider,
  });
}

/**
 * Resolve parser metadata for a failed batch item: error payload, last successful
 * parse attempt in the same request, or org routing context.
 */
export function resolveBatchItemParseFieldsForFailure(
  error: unknown,
  ctx: OrgCvParseContext,
  filename: string,
  fileSize = 0,
  lastParseFields?: BatchItemParseFields,
): BatchItemParseFields {
  const fromError = batchItemParseFieldsFromProcessError(error);
  if (fromError) {
    return fromError;
  }
  if (lastParseFields) {
    return lastParseFields;
  }
  return batchItemParseFieldsFromContext(ctx, filename, fileSize);
}

export function batchItemParseFieldsFromUsage(
  usage: CvParseUsageMetadata,
): BatchItemParseFields {
  return batchItemFieldsFromParseUsage(usage);
}

export function failedCvBatchItemPayload(
  filename: string,
  error: string,
  parseFields: BatchItemParseFields,
): {
  filename: string;
  status: 'failed';
  error: string;
  processedAt: Date;
  cvParseMode: BatchItemParseFields['cvParseMode'];
  usedProvider: string;
  parseProviderLabel: string;
} {
  return {
    filename,
    status: 'failed',
    error,
    processedAt: new Date(),
    cvParseMode: parseFields.cvParseMode,
    usedProvider: parseFields.usedProvider,
    parseProviderLabel: parseFields.parseProviderLabel,
  };
}
