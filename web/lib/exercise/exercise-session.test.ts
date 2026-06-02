import { describe, expect, it } from "vitest";
import { buildFixPrompt } from "@/lib/exercise/exercise-fix-prompts";
import {
  availableTileIds,
  buildFixRoundContext,
  canPickTile,
  createExerciseSession,
  createTileTracker,
  lastFailedSlotIndex,
  markTileUsed,
  scoreFixRound,
  scoreMainRound,
  scoreSlot,
} from "@/lib/exercise/exercise-session";
import { SUPERLATIVE_SCALES, shuffleWords } from "@/lib/exercise/superlative-scales";

const speedSequence = [
  "slowest",
  "slower",
  "slow",
  "fast",
  "faster",
  "fastest",
] as const;

describe("shuffleWords", () => {
  it("returns the same words in a permutation", () => {
    const shuffled = shuffleWords(speedSequence, () => 0.5);
    expect(shuffled).toHaveLength(6);
    expect(new Set(shuffled)).toEqual(new Set(speedSequence));
  });
});

describe("scoreSlot", () => {
  it("matches case-insensitively", () => {
    expect(scoreSlot("Fast", "fast")).toBe(true);
    expect(scoreSlot("slow", "fast")).toBe(false);
  });
});

describe("lastFailedSlotIndex", () => {
  it("returns the highest-index wrong slot", () => {
    expect(
      lastFailedSlotIndex([false, true, false, true, true, true]),
    ).toBe(2);
    expect(
      lastFailedSlotIndex([true, true, true, true, true, false]),
    ).toBe(5);
  });

  it("returns undefined when all correct", () => {
    expect(
      lastFailedSlotIndex([true, true, true, true, true, true]),
    ).toBeUndefined();
  });
});

describe("scoreMainRound", () => {
  it("good when all six slots match", () => {
    const result = scoreMainRound([...speedSequence], speedSequence);
    expect(result.tier).toBe("good");
    expect(result.matchCount).toBe(6);
    expect(result.failedSlotIndex).toBeUndefined();
  });

  it("ok with five matches — failed slot is last wrong", () => {
    const picks = [
      "slowest",
      "slower",
      "slow",
      "fast",
      "faster",
      "slow",
    ] as const;
    const result = scoreMainRound(picks, speedSequence);
    expect(result.tier).toBe("ok");
    expect(result.matchCount).toBe(5);
    expect(result.failedSlotIndex).toBe(5);
  });

  it("ok with four matches", () => {
    const picks = [
      "slowest",
      "slower",
      "slow",
      "slow",
      "faster",
      "slow",
    ] as const;
    const result = scoreMainRound(picks, speedSequence);
    expect(result.tier).toBe("ok");
    expect(result.matchCount).toBe(4);
    expect(result.failedSlotIndex).toBe(5);
  });

  it("bad with three or fewer matches", () => {
    expect(
      scoreMainRound(
        ["fastest", "faster", "fast", "slow", "slower", "slowest"],
        speedSequence,
      ).tier,
    ).toBe("bad");
    expect(
      scoreMainRound(
        ["slowest", "slower", "slow", "slow", "slower", "slowest"],
        speedSequence,
      ).matchCount,
    ).toBe(3);
  });
});

describe("tile tracker", () => {
  it("disallows reusing consumed tiles", () => {
    let tracker = createTileTracker();
    expect(canPickTile(tracker, "slow")).toBe(true);
    tracker = markTileUsed(tracker, "slow");
    expect(canPickTile(tracker, "slow")).toBe(false);
    expect(availableTileIds(tracker, [...speedSequence])).not.toContain("slow");
  });
});

describe("buildFixPrompt", () => {
  it("names the expected word", () => {
    const prompt = buildFixPrompt({
      expectedWord: "fastest",
      pickedWord: "fast",
    });
    expect(prompt.line).toContain("fastest");
    expect(prompt.targetWord).toBe("fastest");
    expect(prompt.highlightWord).toBe("fastest");
  });
});

describe("buildFixRoundContext", () => {
  it("uses failed slot expected and picked words", () => {
    const picks = [
      "slowest",
      "slower",
      "slow",
      "fast",
      "faster",
      "slow",
    ] as const;
    const main = scoreMainRound(picks, speedSequence);
    expect(main.tier).toBe("ok");
    expect(main.failedSlotIndex).toBe(5);
    const fix = buildFixRoundContext(
      speedSequence,
      picks,
      main.failedSlotIndex!,
    );
    expect(fix.targetWord).toBe("fastest");
    expect(fix.line).toContain("fastest");
  });
});

describe("scoreFixRound", () => {
  it("grades fix pick against target word", () => {
    expect(scoreFixRound("fastest", "fastest")).toBe("good");
    expect(scoreFixRound("fast", "fastest")).toBe("bad");
  });
});

describe("createExerciseSession", () => {
  it("returns six expected words and shuffled tray", () => {
    const session = createExerciseSession(() => 0);
    expect(session.expectedSequence).toHaveLength(6);
    expect(session.trayOrder).toHaveLength(6);
    expect(new Set(session.trayOrder)).toEqual(
      new Set(session.expectedSequence),
    );
    expect(session.tiles).toHaveLength(6);
  });

  it("uses a known scale from the catalog", () => {
    const session = createExerciseSession(() => 0.5);
    expect(SUPERLATIVE_SCALES.some((s) => s.id === session.scaleId)).toBe(true);
  });
});
