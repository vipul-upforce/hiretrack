const DISPLAY_STATUS_RANK: Record<string, number> = {
  pending: 1,
  failed: 2,
  failure: 2,
  success: 3,
};

/** For UI: keep the best status per filename when legacy duplicates exist. */
export function dedupeBatchItemsByFilename<
  T extends { filename: string; status: string },
>(items: T[]): T[] {
  const byFilename = new Map<string, T>();
  for (const item of items) {
    const existing = byFilename.get(item.filename);
    if (!existing) {
      byFilename.set(item.filename, item);
      continue;
    }
    const itemRank = DISPLAY_STATUS_RANK[item.status] ?? 0;
    const existingRank = DISPLAY_STATUS_RANK[existing.status] ?? 0;
    if (itemRank >= existingRank) {
      byFilename.set(item.filename, item);
    }
  }
  return Array.from(byFilename.values());
}
