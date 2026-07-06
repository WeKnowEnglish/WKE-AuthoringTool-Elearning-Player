import { describe, expect, it } from "vitest";
import {
  buildGrammarRunStats,
  computeGrammarPosterRewards,
  createGrammarRunSession,
  grammarCompletionEventId,
  recordGrammarQuizResult,
} from "./grammar-run-session";

describe("grammar-run-session", () => {
  it("awards base gold for A1 posters", () => {
    const session = createGrammarRunSession(0);
    const stats = buildGrammarRunStats(session, "short-answers-there-is-a1", "A1", 20_000);
    const breakdown = computeGrammarPosterRewards(stats);

    expect(breakdown.baseGold).toBe(5);
    expect(breakdown.timeBonusGold).toBe(0);
    expect(breakdown.quizBonusGold).toBe(0);
    expect(breakdown.totalGold).toBe(5);
    expect(breakdown.experienceDelta).toBe(10);
  });

  it("adds time bonus after 30 seconds", () => {
    const session = createGrammarRunSession(0);
    const stats = buildGrammarRunStats(session, "some-and-any-a2", "A2", 35_000);
    const breakdown = computeGrammarPosterRewards(stats);

    expect(breakdown.baseGold).toBe(8);
    expect(breakdown.timeBonusGold).toBe(2);
    expect(breakdown.totalGold).toBe(10);
    expect(breakdown.experienceDelta).toBe(15);
  });

  it("adds quiz bonus gold up to 3", () => {
    const session = createGrammarRunSession(0);
    recordGrammarQuizResult(session, true);
    recordGrammarQuizResult(session, true);
    recordGrammarQuizResult(session, false);
    recordGrammarQuizResult(session, true);

    const stats = buildGrammarRunStats(session, "short-answers-there-is-a1", "A1", 20_000);
    const breakdown = computeGrammarPosterRewards(stats);

    expect(breakdown.quizBonusGold).toBe(3);
    expect(breakdown.totalGold).toBe(8);
  });

  it("builds stable completion event ids", () => {
    expect(grammarCompletionEventId("grammar-short-answers-there-is-a1", "seed-1")).toBe(
      "grammar-short-answers-there-is-a1:seed-1:complete",
    );
  });
});
