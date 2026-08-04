import { describe, expect, it } from "vitest";
import { shuffleAssessmentDisplay } from "@/lib/assessment/shuffle-display";

describe("shuffleAssessmentDisplay", () => {
  it("keeps a single item stable", () => {
    expect(shuffleAssessmentDisplay(["only"], "seed")).toEqual(["only"]);
  });

  it("is stable for the same seed", () => {
    const bank = ["w1", "w2", "w3", "w4", "extra"];
    const seed = "attempt-abc:story-words";
    expect(shuffleAssessmentDisplay(bank, seed)).toEqual(
      shuffleAssessmentDisplay(bank, seed),
    );
  });

  it("varies bank order across attempt seeds", () => {
    const bank = [
      "pair-1",
      "pair-2",
      "pair-3",
      "pair-4",
      "pair-5",
      "extra-1",
      "extra-2",
    ];
    const orders = new Set(
      Array.from({ length: 24 }, (_, index) =>
        shuffleAssessmentDisplay(bank, `attempt-${index}:def`).join("|"),
      ),
    );
    expect(orders.size).toBeGreaterThan(5);
  });

  it("does not leave author order as the only outcome", () => {
    const bank = ["a", "b", "c", "d", "e", "f", "g"];
    const author = bank.join("|");
    const shuffledOrders = Array.from({ length: 16 }, (_, index) =>
      shuffleAssessmentDisplay(bank, `pilot-${index}:responses`).join("|"),
    );
    expect(shuffledOrders.some((order) => order !== author)).toBe(true);
  });
});
