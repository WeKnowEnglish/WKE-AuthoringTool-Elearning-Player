import type { ScreenPayload } from "@/lib/lesson-schemas";

/** Interaction screens that count toward first-try accuracy (vocab set flow). */
export const VOCAB_GRADED_SUBTYPES = new Set([
  "true_false",
  "fill_blanks",
  "letter_mixup",
]);

export type VocabPracticeWordMeta = {
  id: string;
  lemma: string;
  imageUrl: string;
};

export type VocabRunSession = {
  startedAtMs: number;
  firstTryGraded: number;
  firstTryCorrect: number;
  reviewWordIds: string[];
  practiceGold: number;
};

export type VocabRunStats = {
  elapsedMs: number;
  practiceWordCount: number;
  firstTryGraded: number;
  firstTryCorrect: number;
  firstTryAccuracyPercent: number;
  wordsMastered: number;
  reviewWordIds: string[];
  practiceGold: number;
};

export type VocabRewardBreakdown = {
  baseGold: number;
  accuracyBonusGold: number;
  masteryBonusGold: number;
  timeBonusGold: number;
  totalGold: number;
  experienceDelta: number;
};

const PAR_MS = 10 * 60 * 1000;

export function createVocabRunSession(nowMs = Date.now()): VocabRunSession {
  return {
    startedAtMs: nowMs,
    firstTryGraded: 0,
    firstTryCorrect: 0,
    reviewWordIds: [],
    practiceGold: 0,
  };
}

export function isVocabGradedInteraction(parsed: ScreenPayload | null): boolean {
  if (!parsed || parsed.type !== "interaction") return false;
  return VOCAB_GRADED_SUBTYPES.has(parsed.subtype);
}

export function extractVocabWordId(parsed: ScreenPayload | null): string | null {
  if (!parsed || parsed.type !== "interaction") return null;
  const raw = parsed as { vocab_word_id?: string };
  if (typeof raw.vocab_word_id === "string" && raw.vocab_word_id.trim()) {
    return raw.vocab_word_id.trim();
  }
  if (parsed.subtype === "letter_mixup") {
    const id = parsed.items[0]?.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  }
  return null;
}

export function recordVocabRunPass(
  session: VocabRunSession,
  hadWrongOnScreen: boolean,
): void {
  session.firstTryGraded += 1;
  if (!hadWrongOnScreen) session.firstTryCorrect += 1;
}

export function recordVocabRunWrong(
  session: VocabRunSession,
  wordId: string | null,
): void {
  if (!wordId) return;
  if (!session.reviewWordIds.includes(wordId)) {
    session.reviewWordIds.push(wordId);
  }
}

export function recordVocabPracticeGold(session: VocabRunSession, amount: number): void {
  if (amount > 0) session.practiceGold += amount;
}

export function buildVocabRunStats(
  session: VocabRunSession,
  practiceWordCount: number,
  endedAtMs = Date.now(),
): VocabRunStats {
  const elapsedMs = Math.max(0, endedAtMs - session.startedAtMs);
  const firstTryGraded = session.firstTryGraded;
  const firstTryCorrect = session.firstTryCorrect;
  const firstTryAccuracyPercent =
    firstTryGraded > 0 ? Math.round((100 * firstTryCorrect) / firstTryGraded) : 100;
  const reviewSet = new Set(session.reviewWordIds);
  const wordsMastered = Math.max(0, practiceWordCount - reviewSet.size);

  return {
    elapsedMs,
    practiceWordCount,
    firstTryGraded,
    firstTryCorrect,
    firstTryAccuracyPercent,
    wordsMastered,
    reviewWordIds: [...session.reviewWordIds],
    practiceGold: session.practiceGold,
  };
}

export function computeVocabSetRewards(stats: VocabRunStats): VocabRewardBreakdown {
  const baseGold = 12;
  const accuracyBonusGold = Math.min(
    42,
    Math.floor((stats.firstTryAccuracyPercent / 100) * 42),
  );
  const masteryBonusGold = Math.min(24, stats.wordsMastered * 4);
  const timeBonusGold = Math.min(36, Math.floor(Math.max(0, PAR_MS - stats.elapsedMs) / 9000));
  const totalGold = baseGold + accuracyBonusGold + masteryBonusGold + timeBonusGold;
  const experienceDelta = 6 + Math.floor(totalGold / 6);
  return {
    baseGold,
    accuracyBonusGold,
    masteryBonusGold,
    timeBonusGold,
    totalGold,
    experienceDelta,
  };
}

/** Gold still owed at completion after per-screen practice awards. */
export function vocabCompletionGoldDelta(
  breakdown: VocabRewardBreakdown,
  practiceGoldAlreadyAwarded: number,
): number {
  return Math.max(0, breakdown.totalGold - practiceGoldAlreadyAwarded);
}

export function formatVocabElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
