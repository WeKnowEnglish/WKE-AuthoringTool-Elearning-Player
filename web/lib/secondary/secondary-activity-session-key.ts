/** Stable key for today's word set — ignores session metadata-only refreshes. */
export function buildSecondaryDailyWordSetFingerprint(
  dateKey: string,
  wordItemIds: readonly string[],
  activityKey?: string,
): string | null {
  if (!dateKey || wordItemIds.length === 0) return null;
  const base = `${dateKey}:${wordItemIds.join(",")}`;
  return activityKey ? `${base}:${activityKey}` : base;
}

export function wordItemIdsFromSetKey(wordSetKey: string): string[] {
  return wordSetKey.split(",").filter(Boolean);
}
