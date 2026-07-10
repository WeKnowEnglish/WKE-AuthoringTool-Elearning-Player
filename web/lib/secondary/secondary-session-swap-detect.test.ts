import { describe, expect, it } from "vitest";
import { detectNewFocusWordSwaps } from "@/lib/secondary/secondary-session-swap-detect";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

function session(overrides: Partial<SecondaryTodaySession> = {}): SecondaryTodaySession {
  return {
    dateKey: "2026-07-10",
    warmUpWordItemIds: [],
    todayWordItemIds: ["w1", "w2"],
    allWordItemIds: ["w1", "w2"],
    introducedWordItemIds: [],
    replacedOutWordItemIds: [],
    ...overrides,
  };
}

describe("detectNewFocusWordSwaps", () => {
  it("returns empty when previous is null", () => {
    expect(detectNewFocusWordSwaps(null, session())).toEqual([]);
  });

  it("returns empty when dateKey changes", () => {
    const prev = session();
    const next = session({ dateKey: "2026-07-11", introducedWordItemIds: ["w9"] });
    expect(detectNewFocusWordSwaps(prev, next)).toEqual([]);
  });

  it("detects a single swap", () => {
    const prev = session();
    const next = session({
      replacedOutWordItemIds: ["w1"],
      introducedWordItemIds: ["w9"],
    });
    expect(detectNewFocusWordSwaps(prev, next)).toEqual([
      { outWordItemId: "w1", inWordItemId: "w9" },
    ]);
  });

  it("detects multiple swaps in order", () => {
    const prev = session({
      replacedOutWordItemIds: ["a"],
      introducedWordItemIds: ["x"],
    });
    const next = session({
      replacedOutWordItemIds: ["a", "b", "c"],
      introducedWordItemIds: ["x", "y", "z"],
    });
    expect(detectNewFocusWordSwaps(prev, next)).toEqual([
      { outWordItemId: "b", inWordItemId: "y" },
      { outWordItemId: "c", inWordItemId: "z" },
    ]);
  });

  it("returns empty when introduced shrinks (stale rebuild)", () => {
    const prev = session({ introducedWordItemIds: ["w9"] });
    const next = session({ introducedWordItemIds: [] });
    expect(detectNewFocusWordSwaps(prev, next)).toEqual([]);
  });

  it("returns empty when out/in lengths mismatch", () => {
    const prev = session();
    const next = session({
      replacedOutWordItemIds: ["w1", "w2"],
      introducedWordItemIds: ["w9"],
    });
    expect(detectNewFocusWordSwaps(prev, next)).toEqual([]);
  });

  it("returns empty when only warm-up changes", () => {
    const prev = session({ warmUpWordItemIds: ["wu1", "wu2"] });
    const next = session({ warmUpWordItemIds: ["wu2"] });
    expect(detectNewFocusWordSwaps(prev, next)).toEqual([]);
  });

  it("matches reconcileSecondarySessionSlowReplace swap arrays", async () => {
    const { reconcileSecondarySessionSlowReplace } = await import(
      "@/lib/secondary/secondary-session-slow-replace"
    );
    const prev = session({ todayWordItemIds: ["w1", "w2", "w3", "w4"], allWordItemIds: ["w1", "w2", "w3", "w4"] });
    const { session: next, swaps } = reconcileSecondarySessionSlowReplace({
      session: {
        ...prev,
        masteredOnListOrder: ["w1", "w2", "w3"],
      },
      candidateWordItemIds: ["w1", "w2", "w3", "w4", "w5", "w6"],
      masteryRecords: {},
      studentId: "student-a",
      now: new Date("2026-07-10T10:00:00.000Z"),
    });

    if (swaps.length === 0) return;

    expect(detectNewFocusWordSwaps(prev, next)).toEqual(swaps);
  });
});
