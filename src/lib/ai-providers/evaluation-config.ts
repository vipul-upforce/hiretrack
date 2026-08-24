import type { IEvaluationConfig } from '@/lib/models/settings';

type EvaluationPageLimitConfig = Pick<
  IEvaluationConfig,
  'autoEvaluateAllCandidates' | 'maxPdfPages'
>;

/**
 * Resolves the effective PDF page limit from evaluation settings.
 * When "Evaluate All PDF Resumes Pages" is enabled, page limits are ignored (0 = no limit).
 */
export function getEffectiveMaxPdfPages(
  config: EvaluationPageLimitConfig | null | undefined,
): number {
  if (config?.autoEvaluateAllCandidates) {
    return 0;
  }
  return Math.max(0, config?.maxPdfPages ?? 0);
}
