import { getProgressSnapshot, setProgressSnapshot } from "@/lib/progress/local-storage";
import { getPlayerLevel } from "@/lib/progress/rewards";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";
import {
  expectedVocabPlayerScreenCount,
  VOCAB_PLAYER_SAMPLE_SIZE,
} from "@/lib/pilots/compile-vocab-player-run-constants";
import { isVocabSetQuizReady } from "@/lib/pilots/vocab-player-pool";
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

/** One-time wipe of Product A mid-run indexes (same numeric range, different spine). */
const VOCAB_RESUME_SPINE_KEY = "wke.vocabResumeSpine";
const VOCAB_RESUME_SPINE = "vocab-player-v1";

function wipeStaleProductAResumesOnce(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(VOCAB_RESUME_SPINE_KEY) === VOCAB_RESUME_SPINE) return;
    const snapshot = getProgressSnapshot();
    const resume = { ...(snapshot.lessonResume ?? {}) };
    let changed = false;
    for (const lessonId of Object.keys(resume)) {
      if (!parseVocabSetIdFromLessonId(lessonId)) continue;
      delete resume[lessonId];
      changed = true;
    }
    if (changed) {
      setProgressSnapshot({ ...snapshot, lessonResume: resume });
    }
    localStorage.setItem(VOCAB_RESUME_SPINE_KEY, VOCAB_RESUME_SPINE);
  } catch {
    /* ignore storage failures */
  }
}

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

/**
 * Five learner-facing phases inside a Vocab Player set run
 * (flashcards → letter → line match → MC → listen).
 */
export const VOCAB_PHASE_LABELS = [
  "Flashcards",
  "Spell the word",
  "Match pictures",
  "Choose the word",
  "Listen and choose",
] as const;

export type VocabPhaseIndex = 0 | 1 | 2 | 3 | 4;

export function vocabPhaseFromResumeIndex(
  resumeIndex: number,
  practiceCount = VOCAB_PLAYER_SAMPLE_SIZE,
): VocabPhaseIndex {
  const index = Math.max(0, Math.floor(resumeIndex));
  const letterStart = 1;
  const matchStart = letterStart + practiceCount;
  const mcStart = matchStart + 1;
  const listenStart = mcStart + practiceCount;
  if (index < letterStart) return 0;
  if (index < matchStart) return 1;
  if (index < mcStart) return 2;
  if (index < listenStart) return 3;
  return 4;
}

export function resumeScreenIndexForSet(setId: VocabSetId): number {
  wipeStaleProductAResumesOnce();
  const snapshot = getProgressSnapshot();
  const lessonId = vocabLessonId(setId);
  if (snapshot.completedLessonIds.includes(lessonId)) return 0;
  const resume = snapshot.lessonResume?.[lessonId];
  if (typeof resume !== "number" || !Number.isFinite(resume) || resume <= 0) return 0;
  const max = Math.max(0, expectedVocabPlayerScreenCount(VOCAB_PLAYER_SAMPLE_SIZE) - 1);
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
 * 2) First unlocked image-ready set not yet explored
 * 3) First unlocked image-ready set (replay)
 */
export function pickContinueVocabTarget(playerLevel = getPlayerLevel()): ContinueVocabTarget {
  wipeStaleProductAResumesOnce();
  const snapshot = getProgressSnapshot();
  const menuOrder = listVocabSetsInMenuOrder();

  let bestResume: { setId: VocabSetId; index: number } | null = null;
  for (const [lessonId, rawIndex] of Object.entries(snapshot.lessonResume ?? {})) {
    const setId = parseVocabSetIdFromLessonId(lessonId);
    if (!setId) continue;
    if (snapshot.completedLessonIds.includes(lessonId)) continue;
    if (typeof rawIndex !== "number" || !Number.isFinite(rawIndex) || rawIndex <= 0) continue;
    if (!isUnlockAvailable(`vocab_set:${setId}`, playerLevel)) continue;
    if (!isVocabSetQuizReady(setId)) continue;
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
    if (!isVocabSetQuizReady(setId)) continue;
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
    if (!isVocabSetQuizReady(setId)) continue;
    return { setId, resumeScreenIndex: 0, reason: "replay" };
  }

  return {
    setId: "breakfast_food",
    resumeScreenIndex: 0,
    reason: "replay",
  };
}
