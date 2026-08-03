import { describe, expect, it } from "vitest";
import {
  normalizeSecondaryAnswer,
  scoreSecondaryAnswers,
  scoreSequence,
  SECONDARY_HOMEWORK_ONE,
  sequenceAnswers,
  sequenceFromAnswers,
} from "@/lib/homework-templates/secondary-homework-one";

describe("Secondary Homework One", () => {
  it("scores the event sequence by position", () => {
    expect(scoreSequence(["C", "D", "A", "B", "E"])).toBe(5);
    expect(scoreSequence(["A", "B", "C", "D", "E"])).toBe(1);
  });

  it("round-trips a saved sequence", () => {
    const order = ["C", "D", "A", "B", "E"];
    expect(sequenceFromAnswers(sequenceAnswers(order))).toEqual(order);
  });

  it("normalizes case, whitespace, and curly apostrophes", () => {
    expect(normalizeSecondaryAnswer("  Didn’t   THINK ")).toBe("didn't think");
  });

  it("accepts contracted and full negative forms", () => {
    const line = SECONDARY_HOMEWORK_ONE.dialogue.lines[7];
    expect(scoreSecondaryAnswers({ [line.id]: "was not" }, [line])).toBe(1);
  });
});
