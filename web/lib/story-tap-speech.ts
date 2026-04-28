import type { StoryTapSpeechEntry } from "@/lib/lesson-schemas";

export type TapSpeechResolution = {
  entry: StoryTapSpeechEntry;
  key: string;
  repeatFinalPriority: boolean;
};

function phaseMatch(entry: StoryTapSpeechEntry, activePhaseId: string | null): boolean {
  if (!entry.phase_ids || entry.phase_ids.length === 0) return true;
  if (!activePhaseId) return false;
  return entry.phase_ids.includes(activePhaseId);
}

function entrySort(
  a: { entry: StoryTapSpeechEntry; idx: number },
  b: { entry: StoryTapSpeechEntry; idx: number },
): number {
  if (a.entry.priority !== b.entry.priority) return a.entry.priority - b.entry.priority;
  return a.idx - b.idx;
}

export function tapSpeechCounterKey(phaseId: string, itemId: string, entryId: string): string {
  return `${phaseId}:${itemId}:${entryId}`;
}

export function resolveTapSpeechEntry(opts: {
  entries: StoryTapSpeechEntry[] | undefined;
  activePhaseId: string | null;
  itemId: string;
  counters: Record<string, number>;
}): TapSpeechResolution | null {
  const entries = opts.entries ?? [];
  if (entries.length === 0) return null;
  const phaseId = opts.activePhaseId ?? "__legacy";
  const eligible = entries
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => phaseMatch(entry, opts.activePhaseId))
    .sort(entrySort);
  if (eligible.length === 0) return null;

  for (const row of eligible) {
    const key = tapSpeechCounterKey(phaseId, opts.itemId, row.entry.id);
    const max = row.entry.max_plays;
    const played = opts.counters[key] ?? 0;
    if (!max || played < max) {
      return { entry: row.entry, key, repeatFinalPriority: false };
    }
  }

  const last = eligible[eligible.length - 1]!;
  return {
    entry: last.entry,
    key: tapSpeechCounterKey(phaseId, opts.itemId, last.entry.id),
    repeatFinalPriority: true,
  };
}

export function bumpTapSpeechCounter(
  counters: Record<string, number>,
  resolved: TapSpeechResolution | null,
): Record<string, number> {
  if (!resolved) return counters;
  if (resolved.repeatFinalPriority) return counters;
  if (!resolved.entry.max_plays) return counters;
  return { ...counters, [resolved.key]: (counters[resolved.key] ?? 0) + 1 };
}
