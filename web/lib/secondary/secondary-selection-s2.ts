import {
  TARGET_TODAY_WORDS,
  type SecondarySessionSelectionReason,
} from "@/lib/secondary/secondary-session-selection";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

export const SECONDARY_MAX_WORDS_PER_TOPIC = 4;
export const SECONDARY_STRETCH_QUOTA = 1;
export const SECONDARY_MAX_STRETCH_DIFFICULTY = 5;

export function topicIdForWordItem(wordItemId: string): string {
  return getSecondaryVocabItemById(wordItemId)?.topicId ?? "unknown";
}

export function difficultyForWordItem(wordItemId: string): number {
  return getSecondaryVocabItemById(wordItemId)?.difficulty ?? 2;
}

export function countWordsPerTopic(wordItemIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const wordItemId of wordItemIds) {
    const topicId = topicIdForWordItem(wordItemId);
    counts.set(topicId, (counts.get(topicId) ?? 0) + 1);
  }
  return counts;
}

export function medianDifficultyForWordItems(wordItemIds: string[]): number {
  if (wordItemIds.length === 0) return 2;
  const values = wordItemIds
    .map((wordItemId) => difficultyForWordItem(wordItemId))
    .sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[mid] ?? 2;
  const lower = values[mid - 1] ?? 2;
  const upper = values[mid] ?? lower;
  return Math.round((lower + upper) / 2);
}

export function enforceTopicSpreadOnTodayList(input: {
  todayWordItemIds: string[];
  replacementPoolWordItemIds: string[];
  picked: Set<string>;
  reasons: Record<string, SecondarySessionSelectionReason>;
  maxPerTopic?: number;
}): void {
  const maxPerTopic = input.maxPerTopic ?? SECONDARY_MAX_WORDS_PER_TOPIC;
  const todayWordItemIds = input.todayWordItemIds;

  const replacementSet = new Set(
    input.replacementPoolWordItemIds.filter((wordItemId) => !input.picked.has(wordItemId)),
  );

  let changed = true;
  while (changed) {
    changed = false;
    const counts = countWordsPerTopic(todayWordItemIds);

    for (let index = todayWordItemIds.length - 1; index >= 0; index -= 1) {
      const wordItemId = todayWordItemIds[index]!;
      const topicId = topicIdForWordItem(wordItemId);
      if ((counts.get(topicId) ?? 0) <= maxPerTopic) continue;

      const replacement = [...replacementSet].find((candidateId) => {
        if (input.picked.has(candidateId) && todayWordItemIds.includes(candidateId)) return false;
        const candidateTopic = topicIdForWordItem(candidateId);
        if (candidateTopic === topicId) return false;
        return (counts.get(candidateTopic) ?? 0) < maxPerTopic;
      });

      if (!replacement) continue;

      todayWordItemIds[index] = replacement;
      input.picked.delete(wordItemId);
      input.picked.add(replacement);
      delete input.reasons[wordItemId];
      if (!input.reasons[replacement]) {
        input.reasons[replacement] = "refresh";
      }
      replacementSet.delete(replacement);
      changed = true;
      break;
    }
  }
}

export function applyStretchWordToTodayList(input: {
  todayWordItemIds: string[];
  stretchCandidateWordItemIds: string[];
  picked: Set<string>;
  reasons: Record<string, SecondarySessionSelectionReason>;
  stretchQuota?: number;
}): void {
  const stretchQuota = input.stretchQuota ?? SECONDARY_STRETCH_QUOTA;
  const existingStretch = input.todayWordItemIds.filter((id) => input.reasons[id] === "stretch");
  if (existingStretch.length >= stretchQuota) return;

  const median = medianDifficultyForWordItems(input.todayWordItemIds);
  const targetDifficulty = Math.min(SECONDARY_MAX_STRETCH_DIFFICULTY, median + 1);

  const stretchPick = input.stretchCandidateWordItemIds.find((wordItemId) => {
    if (input.picked.has(wordItemId) && input.todayWordItemIds.includes(wordItemId)) return false;
    return difficultyForWordItem(wordItemId) >= targetDifficulty;
  });

  if (!stretchPick) return;

  const refreshIndex = [...input.todayWordItemIds]
    .map((wordItemId, index) => ({ wordItemId, index }))
    .reverse()
    .find((entry) => input.reasons[entry.wordItemId] === "refresh")?.index;

  if (refreshIndex !== undefined) {
    const replaced = input.todayWordItemIds[refreshIndex]!;
    input.picked.delete(replaced);
    delete input.reasons[replaced];
    input.todayWordItemIds[refreshIndex] = stretchPick;
  } else if (input.todayWordItemIds.length < TARGET_TODAY_WORDS) {
    input.todayWordItemIds.push(stretchPick);
  } else {
    return;
  }

  input.picked.add(stretchPick);
  input.reasons[stretchPick] = "stretch";
}
