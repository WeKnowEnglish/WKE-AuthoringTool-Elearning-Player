import { getProgressSnapshot } from "@/lib/progress/local-storage";
import { getPlayerLevel } from "@/lib/progress/rewards";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";
import {
  ANIMALS_VOCAB_SET_MENU,
  BODY_VOCAB_SET_MENU,
  FOOD_VOCAB_SET_MENU,
  JOBS_VOCAB_SET_MENU,
  SCHOOL_VOCAB_SET_MENU,
  VOCAB_TOP_MENU,
  isVocabSetId,
  type VocabSetId,
} from "@/lib/vocabulary-templates";
import { DEFAULT_PRACTICE_COUNT } from "@/lib/vocabulary-templates/types";
import { expectedVocabularyScreenCount } from "@/lib/vocabulary-templates/validate";
import {
  explorationNodeKey,
  isExplorationNodeTouched,
} from "@/lib/worlds/exploration";

const HUB_MENUS = {
  food: FOOD_VOCAB_SET_MENU,
  animals: ANIMALS_VOCAB_SET_MENU,
  school: SCHOOL_VOCAB_SET_MENU,
  body: BODY_VOCAB_SET_MENU,
  jobs: JOBS_VOCAB_SET_MENU,
} as const;

/** Curriculum order matching the Vocabulary topics menu. */
export function listVocabSetsInMenuOrder(): VocabSetId[] {
  const ids: VocabSetId[] = [];
  for (const entry of VOCAB_TOP_MENU) {
    if (entry.kind === "set") {
      ids.push(entry.id);
      continue;
    }
    for (const set of HUB_MENUS[entry.hubId]) {
      ids.push(set.id);
    }
  }
  return ids;
}

export function vocabLessonId(setId: VocabSetId): string {
  return `vocab-${setId}`;
}

export function parseVocabSetIdFromLessonId(lessonId: string): VocabSetId | null {
  const match = /^vocab-(.+)$/.exec(lessonId);
  if (!match?.[1] || !isVocabSetId(match[1])) return null;
  return match[1];
}

/** Five learner-facing phases inside a vocab set run. */
export const VOCAB_PHASE_LABELS = [
  "Learn words",
  "True or false",
  "Match the word",
  "Fill in the blanks",
  "Spell the word",
] as const;

export type VocabPhaseIndex = 0 | 1 | 2 | 3 | 4;

export function vocabPhaseFromResumeIndex(
  resumeIndex: number,
  practiceCount = DEFAULT_PRACTICE_COUNT,
): VocabPhaseIndex {
  const index = Math.max(0, Math.floor(resumeIndex));
  if (index <= 1) return 0;
  const matchIndex = 2 + practiceCount;
  if (index < matchIndex) return 1;
  if (index === matchIndex) return 2;
  const clozeEnd = matchIndex + 1 + practiceCount;
  if (index < clozeEnd) return 3;
  return 4;
}

export function resumeScreenIndexForSet(setId: VocabSetId): number {
  const snapshot = getProgressSnapshot();
  const lessonId = vocabLessonId(setId);
  if (snapshot.completedLessonIds.includes(lessonId)) return 0;
  const resume = snapshot.lessonResume?.[lessonId];
  if (typeof resume !== "number" || !Number.isFinite(resume) || resume <= 0) return 0;
  const max = Math.max(0, expectedVocabularyScreenCount(DEFAULT_PRACTICE_COUNT) - 1);
  return Math.min(Math.floor(resume), max);
}

export type ContinueVocabTarget = {
  setId: VocabSetId;
  resumeScreenIndex: number;
  reason: "resume" | "next_unlocked" | "replay";
};

/**
 * Pick the set Continue Learning should open:
 * 1) Incomplete resume (highest screen index)
 * 2) First unlocked set not yet explored
 * 3) First unlocked set (replay)
 */
export function pickContinueVocabTarget(playerLevel = getPlayerLevel()): ContinueVocabTarget {
  const snapshot = getProgressSnapshot();
  const menuOrder = listVocabSetsInMenuOrder();

  let bestResume: { setId: VocabSetId; index: number } | null = null;
  for (const [lessonId, rawIndex] of Object.entries(snapshot.lessonResume ?? {})) {
    const setId = parseVocabSetIdFromLessonId(lessonId);
    if (!setId) continue;
    if (snapshot.completedLessonIds.includes(lessonId)) continue;
    if (typeof rawIndex !== "number" || !Number.isFinite(rawIndex) || rawIndex <= 0) continue;
    if (!isUnlockAvailable(`vocab_set:${setId}`, playerLevel)) continue;
    if (!bestResume || rawIndex > bestResume.index) {
      bestResume = { setId, index: Math.floor(rawIndex) };
    }
  }
  if (bestResume) {
    return {
      setId: bestResume.setId,
      resumeScreenIndex: resumeScreenIndexForSet(bestResume.setId),
      reason: "resume",
    };
  }

  for (const setId of menuOrder) {
    if (!isUnlockAvailable(`vocab_set:${setId}`, playerLevel)) continue;
    const touched = isExplorationNodeTouched(
      explorationNodeKey({ kind: "vocab_set", setId }),
    );
    const completed = snapshot.completedLessonIds.includes(vocabLessonId(setId));
    if (!touched && !completed) {
      return { setId, resumeScreenIndex: 0, reason: "next_unlocked" };
    }
  }

  for (const setId of menuOrder) {
    if (!isUnlockAvailable(`vocab_set:${setId}`, playerLevel)) continue;
    return { setId, resumeScreenIndex: 0, reason: "replay" };
  }

  return {
    setId: "breakfast_food",
    resumeScreenIndex: 0,
    reason: "replay",
  };
}
