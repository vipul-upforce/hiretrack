import { MIN_BULK_CV_PROVIDERS_CONFIGURED } from '@/lib/cv-processing/config';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';
import { BULK_CV_PROVIDER_FIELDS, type BulkCvAiFormValues } from './types';

/**
 * Providers that will have a key after save: non-empty field, or unchanged
 * field that still maps to a key loaded from the server (retain on PUT).
 */
export function getConfiguredBulkCvProviderIds(
  values: BulkCvAiFormValues,
  initialValues: BulkCvAiFormValues,
): BulkCvProviderId[] {
  return BULK_CV_PROVIDER_FIELDS.filter((f) => {
    const key = String(values[f.apiKeyField] ?? '').trim();
    if (key) return true;
    const initialKey = String(initialValues[f.apiKeyField] ?? '').trim();
    return (
      values[f.apiKeyField] === initialValues[f.apiKeyField] &&
      Boolean(initialKey)
    );
  }).map((f) => f.id);
}

export function meetsMinBulkCvProvidersConfigured(
  values: BulkCvAiFormValues,
  initialValues: BulkCvAiFormValues,
): boolean {
  return (
    getConfiguredBulkCvProviderIds(values, initialValues).length >=
    MIN_BULK_CV_PROVIDERS_CONFIGURED
  );
}

export const MIN_BULK_CV_PROVIDERS_MESSAGE = `Configure and verify at least ${MIN_BULK_CV_PROVIDERS_CONFIGURED} provider keys before saving.`;
