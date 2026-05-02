import { describe, expect, it } from "vitest";
import { normalizeLearningGoals, parseLearningGoalsFromDb } from "./learning-goals";

describe("normalizeLearningGoals", () => {
  it("trims and drops empties", () => {
    expect(normalizeLearningGoals(["  a  ", "", "b"])).toEqual(["a", "b"]);
  });

  it("skips consecutive case-insensitive duplicates", () => {
    expect(normalizeLearningGoals(["Hello", "hello", "World"])).toEqual(["Hello", "World"]);
  });
});

describe("parseLearningGoalsFromDb", () => {
  it("handles non-array", () => {
    expect(parseLearningGoalsFromDb(null)).toEqual([]);
  });

  it("filters strings", () => {
    expect(parseLearningGoalsFromDb(["x", 1, " y "])).toEqual(["x", "y"]);
  });
});
