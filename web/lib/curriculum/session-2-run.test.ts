import { describe, expect, it } from "vitest";
import { emptySession2RunProgress, normalizeSession2RunProgress } from "./session-2-run";

describe("Session 2 run contract", () => {
  it("creates a safe initial snapshot", () => {
    expect(normalizeSession2RunProgress(null)).toEqual(emptySession2RunProgress());
  });

  it("filters untrusted progress values", () => {
    expect(normalizeSession2RunProgress({ foundTokenIds: ["name", "bad", "name"], questionChunks: ["What", "hack"], visitedFriendIds: ["mia", "bad", "mia"], chosenFriendId: "leo", introPronoun: "They", checkIndex: 99, completedPracticeActivityIds: ["vocabulary", "bad"] })).toMatchObject({ foundTokenIds: ["name"], questionChunks: ["What"], visitedFriendIds: ["mia"], chosenFriendId: "leo", introPronoun: null, checkIndex: 3, completedPracticeActivityIds: ["vocabulary"] });
  });
});
