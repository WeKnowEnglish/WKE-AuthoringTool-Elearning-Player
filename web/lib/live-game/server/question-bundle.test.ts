import { describe, expect, it } from "vitest";
import { buildSystemSnapshotFromSeeds } from "@/lib/live-game/question-banks/seed-data";
import { buildSafeLiveGameQuestionBundle } from "@/lib/live-game/server/question-bundle";

describe("live-game lobby question preload", () => {
  it("includes every bank without exposing grading keys", () => {
    const snapshot = buildSystemSnapshotFromSeeds("grade56-adjectives");
    const bundle = buildSafeLiveGameQuestionBundle({
      roomId: "wke-live-game-ABC123",
      questionSetId: snapshot.id,
      questionSetVersion: snapshot.version,
      snapshot,
    });

    expect(bundle.harvest).toHaveLength(snapshot.harvest.length);
    expect(bundle.deposit).toHaveLength(snapshot.deposit.length);
    expect(bundle.craft).toHaveLength(snapshot.craft.length);

    const serialized = JSON.stringify(bundle);
    expect(serialized).not.toContain("correctAnswers");
    expect(serialized).not.toContain("correctOrder");
    expect(serialized).not.toContain("targetWord");
    expect(serialized).not.toContain("answerLetters");
  });
});
