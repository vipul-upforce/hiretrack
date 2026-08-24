/**
 * Single history title for all CV batch upload paths (immediate, deferred, retry).
 * Flow-specific distinction lives on batch/candidate ids, not the display title.
 */
export const CV_BATCH_UPLOAD_HISTORY_TITLE = 'cv-process batch' as const;

/** Matches current title and legacy per-flow titles already stored in MongoDB. */
export function isCvBatchUploadHistoryTitle(
  title: string | null | undefined,
): boolean {
  if (!title) {
    return false;
  }
  return (
    title === CV_BATCH_UPLOAD_HISTORY_TITLE || title.startsWith('cv-process')
  );
}
