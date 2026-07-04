import { recordGardenWordSpelledQuest } from "@/lib/garden/garden-quests";
import { unlockFertilizer, hasFertilizerUnlocked } from "@/lib/garden/fertilizer";
import { unlockWateringCan, hasWateringCanUnlocked } from "@/lib/garden/watering-can";
import { setGardenSnapshot } from "@/lib/garden/storage";
import {
  getGardenSpellingLevel,
  isWordInSpellingLevel,
  nextSpellingLevel,
  spellingLevelProgress,
} from "@/lib/garden/spelling-levels";
import { canAffordWord, consumeLetters, isGardenSpellingWord } from "@/lib/garden/spelling";
import type { GardenItemId, GardenSnapshotV1 } from "@/lib/garden/types";

export type SpellResult =
  | {
      ok: true;
      snapshot: GardenSnapshotV1;
      word: string;
      itemUnlocked?: GardenItemId;
      levelComplete?: boolean;
      advancedToLevel?: number;
    }
  | {
      ok: false;
      reason: "not_a_word" | "not_in_level" | "missing_letters" | "already_spelled";
    };

export function isSpellableWordForLevel(
  levelId: GardenSnapshotV1["spellingLevel"],
  word: string,
): boolean {
  const normalized = word.trim().toUpperCase();
  return (
    isGardenSpellingWord(normalized) && isWordInSpellingLevel(levelId, normalized)
  );
}

export function trySpellWord(
  snapshot: GardenSnapshotV1,
  word: string,
  now = Date.now(),
): SpellResult {
  const normalized = word.trim().toUpperCase();
  const levelId = snapshot.spellingLevel;

  if (!isGardenSpellingWord(normalized)) {
    return { ok: false, reason: "not_a_word" };
  }
  if (!isWordInSpellingLevel(levelId, normalized)) {
    return { ok: false, reason: "not_in_level" };
  }
  if (snapshot.spelledAtLevel.includes(normalized)) {
    return { ok: false, reason: "already_spelled" };
  }
  if (!canAffordWord(snapshot.letters, normalized)) {
    return { ok: false, reason: "missing_letters" };
  }

  const spelledAtLevel = [...snapshot.spelledAtLevel, normalized];
  const spelledWords = snapshot.spelledWords.includes(normalized) ?
    snapshot.spelledWords
  : [...snapshot.spelledWords, normalized];

  const progress = spellingLevelProgress(levelId, spelledAtLevel);
  const advanced = progress.isComplete ? nextSpellingLevel(levelId) : null;

  let nextSnapshot: GardenSnapshotV1 = {
    ...snapshot,
    letters: consumeLetters(snapshot.letters, normalized),
    spelledWords,
    spelledAtLevel: advanced ? [] : spelledAtLevel,
    spellingLevel: advanced ?? levelId,
    lastUpdatedAt: now,
  };

  if (progress.isComplete && levelId === 1) {
    nextSnapshot = unlockWateringCan(nextSnapshot);
  }
  if (progress.isComplete && levelId === 2) {
    nextSnapshot = unlockFertilizer(nextSnapshot);
  }

  const next = setGardenSnapshot(nextSnapshot);

  const wateringCanUnlocked =
    progress.isComplete && levelId === 1 && !hasWateringCanUnlocked(snapshot);
  const fertilizerUnlocked =
    progress.isComplete && levelId === 2 && !hasFertilizerUnlocked(snapshot);

  recordGardenWordSpelledQuest();

  return {
    ok: true,
    snapshot: next,
    word: normalized,
    itemUnlocked:
      wateringCanUnlocked ? "watering_can"
      : fertilizerUnlocked ? "fertilizer"
      : undefined,
    levelComplete: progress.isComplete,
    advancedToLevel: advanced ?? undefined,
  };
}

export function getSpellingLevelLabel(snapshot: GardenSnapshotV1): string {
  return getGardenSpellingLevel(snapshot.spellingLevel).title;
}
