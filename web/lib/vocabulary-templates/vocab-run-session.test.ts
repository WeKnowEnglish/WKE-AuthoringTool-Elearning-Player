import { describe, expect, it } from "vitest";
import {
  buildVocabRunStats,
  computeVocabSetRewards,
  createVocabRunSession,
  recordVocabRunPass,
  recordVocabRunWrong,
  vocabCompletionGoldDelta,
} from "./vocab-run-session";

describe("vocab-run-session", () => {
  it("tracks first-try accuracy and review words", () => {
    const session = createVocabRunSession(0);
    recordVocabRunPass(session, false);
    recordVocabRunWrong(session, "milk");
    recordVocabRunPass(session, true);
    recordVocabRunPass(session, false);

    const stats = buildVocabRunStats(session, 6, 120_000);
    expect(stats.firstTryGraded).toBe(3);
    expect(stats.firstTryCorrect).toBe(2);
    expect(stats.firstTryAccuracyPercent).toBe(67);
    expect(stats.reviewWordIds).toEqual(["milk"]);
    expect(stats.wordsMastered).toBe(5);
    expect(stats.elapsedMs).toBe(120_000);
  });

  it("computes rewards and completion gold delta", () => {
    const session = createVocabRunSession(0);
    for (let i = 0; i < 18; i++) recordVocabRunPass(session, false);
    const stats = buildVocabRunStats(session, 6, 60_000);
    const breakdown = computeVocabSetRewards(stats);
    expect(breakdown.totalGold).toBeGreaterThanOrEqual(12);
    expect(breakdown.experienceDelta).toBeGreaterThanOrEqual(6);
    expect(vocabCompletionGoldDelta(breakdown, 18)).toBe(breakdown.totalGold - 18);
    expect(vocabCompletionGoldDelta(breakdown, breakdown.totalGold)).toBe(0);
  });
});
