import { describe, expect, it } from "vitest";
import {
  attemptsToSuccessFromWrongAttempts,
  buildSecondaryActivityScoreSummary,
  createPendingOutcomes,
  getSecondaryPendingWordIds,
  isSecondaryWordOutcomeDone,
} from "@/lib/secondary/secondary-scaffold";

describe("secondary scaffold", () => {
  it("tracks pending, success, and revealed outcomes", () => {
    const outcomes = createPendingOutcomes(["w1", "w2", "w3"]);
    expect(isSecondaryWordOutcomeDone(outcomes.w1)).toBe(false);
    expect(getSecondaryPendingWordIds(outcomes, ["w1", "w2", "w3"])).toEqual(["w1", "w2", "w3"]);

    outcomes.w1 = { kind: "success", attemptsToSuccess: 1 };
    outcomes.w2 = { kind: "revealed" };
    expect(getSecondaryPendingWordIds(outcomes, ["w1", "w2", "w3"])).toEqual(["w3"]);
  });

  it("maps wrong attempts to success attempt count", () => {
    expect(attemptsToSuccessFromWrongAttempts(0)).toBe(1);
    expect(attemptsToSuccessFromWrongAttempts(1)).toBe(2);
    expect(attemptsToSuccessFromWrongAttempts(2)).toBe(3);
  });

  it("builds understood score excluding revealed words", () => {
    const summary = buildSecondaryActivityScoreSummary(
      {
        w1: { kind: "success", attemptsToSuccess: 1 },
        w2: { kind: "success", attemptsToSuccess: 2 },
        w3: { kind: "success", attemptsToSuccess: 3 },
        w4: { kind: "revealed" },
      },
      ["w1", "w2", "w3", "w4"],
    );

    expect(summary).toEqual({
      firstTry: 1,
      secondTry: 1,
      thirdTry: 1,
      neededHelp: 1,
      total: 4,
      percentUnderstood: 75,
    });
  });
});
