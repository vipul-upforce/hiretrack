import {
  batchItemFieldsFromParseUsage,
  type CvParseUsageMetadata,
} from '../cv-parse-usage';

export type BatchItemParseFields = ReturnType<typeof batchItemFieldsFromParseUsage>;

/** Thrown when resume parsing fails but we know which provider(s) were attempted. */
export class CvResumeProcessError extends Error {
  readonly parseFields: BatchItemParseFields;

  constructor(message: string, parseFields: BatchItemParseFields) {
    super(message);
    this.name = 'CvResumeProcessError';
    this.parseFields = parseFields;
  }

  static fromUsage(
    message: string,
    usage: CvParseUsageMetadata,
  ): CvResumeProcessError {
    return new CvResumeProcessError(message, batchItemFieldsFromParseUsage(usage));
  }
}

function hasParseFieldsPayload(
  error: unknown,
): error is { parseFields: BatchItemParseFields } {
  if (!error || typeof error !== 'object' || !('parseFields' in error)) {
    return false;
  }
  const fields = (error as { parseFields: unknown }).parseFields;
  return (
    !!fields
    && typeof fields === 'object'
    && 'parseProviderLabel' in fields
    && typeof (fields as BatchItemParseFields).parseProviderLabel === 'string'
  );
}

export function isCvResumeProcessError(
  error: unknown,
): error is CvResumeProcessError {
  return error instanceof CvResumeProcessError || hasParseFieldsPayload(error);
}

export function batchItemParseFieldsFromProcessError(
  error: unknown,
): BatchItemParseFields | undefined {
  if (error instanceof CvResumeProcessError) {
    return error.parseFields;
  }
  if (hasParseFieldsPayload(error)) {
    return error.parseFields;
  }
  return undefined;
}
