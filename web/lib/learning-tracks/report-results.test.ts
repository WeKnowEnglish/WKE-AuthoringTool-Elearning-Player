import { describe, expect, it } from "vitest";
import { summarizePostQuizReport } from "./report-results";

describe("post-quiz report results", () => {
  it("summarizes completion, first tries, and retries", () => {
    expect(
      summarizePostQuizReport(["q1", "q2", "q3"], {
        q1: { passed: true, wrongAttempts: 0 },
        q2: { passed: true, wrongAttempts: 2 },
        q3: { passed: true, wrongAttempts: 0 },
      }),
    ).toEqual({
      total: 3,
      completed: 3,
      firstTry: 2,
      retries: 2,
      hasRuntimeResults: true,
    });
  });

  it("returns an authoring fallback when no activity has been played", () => {
    expect(summarizePostQuizReport(["q1", "q2"], {})).toEqual({
      total: 2,
      completed: 0,
      firstTry: 0,
      retries: 0,
      hasRuntimeResults: false,
    });
  });
});
