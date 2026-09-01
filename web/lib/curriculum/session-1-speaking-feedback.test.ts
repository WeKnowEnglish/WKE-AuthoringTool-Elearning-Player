import { describe, expect, it } from "vitest";
import { analyzeSession1Speaking, normalizeSession1SpeakingFeedback } from "./session-1-speaking-feedback";

describe("Session 1 speaking feedback", () => {
  it("recognises a complete station choice", () => {
    const result = analyzeSession1Speaking({
      promptId: "station-choice",
      stationId: "art",
      transcript: "I'd like to visit the art station because I love painting.",
      checkedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(result.status).toBe("clear");
    expect(result.heardParts.every((part) => part.heard)).toBe(true);
  });

  it("gives supportive structural feedback instead of marking an answer wrong", () => {
    const result = analyzeSession1Speaking({
      promptId: "baseline",
      transcript: "My name is Mai and I like books.",
    });
    expect(result.status).toBe("developing");
    expect(result.message).toContain("your age");
    expect(`${result.title} ${result.message}`.toLowerCase()).not.toMatch(/wrong|incorrect|failed/);
  });

  it("turns low transcription confidence into a cautious clarity cue", () => {
    const result = analyzeSession1Speaking({
      promptId: "baseline",
      transcript: "My name is Sam. I am ten. I like reading.",
      tokens: [
        { token: " reading", logprob: -1.5 },
        { token: ".", logprob: -2 },
      ],
    });
    expect(result.status).toBe("developing");
    expect(result.clarityCues).toEqual([{ text: "reading", confidence: expect.any(Number) }]);
  });

  it("rejects malformed persisted feedback", () => {
    expect(normalizeSession1SpeakingFeedback({ promptId: "unknown", transcript: "hello" })).toBeNull();
    expect(normalizeSession1SpeakingFeedback({ promptId: "baseline", transcript: "" })).toBeNull();
  });
});
