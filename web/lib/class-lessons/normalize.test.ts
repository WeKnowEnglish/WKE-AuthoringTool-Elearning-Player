import { describe, expect, it } from "vitest";
import {
  normalizeClassLessonStepInputs,
  normalizeDocumentStepConfig,
  normalizeLiveGameStepConfig,
  normalizeWhiteboardStepConfig,
  normalizeWordCardsStepConfig,
  stepTitleFromConfig,
} from "@/lib/class-lessons/normalize";

describe("class-lessons/normalize", () => {
  it("normalizes whiteboard config with defaults", () => {
    const config = normalizeWhiteboardStepConfig({});
    expect(config.title).toBeTruthy();
    expect(config.timerMinutes).toBeGreaterThan(0);
    expect(["individual", "group", "teacher_demo"]).toContain(config.mode);
  });

  it("normalizes document and word cards configs", () => {
    const document = normalizeDocumentStepConfig({
      templateType: "dialogue",
      title: "  Pair talk  ",
      wordBank: ["hello", "bye"],
    });
    expect(document.templateType).toBe("dialogue");
    expect(document.title).toBe("Pair talk");
    expect(document.wordBank).toEqual(["hello", "bye"]);

    const cards = normalizeWordCardsStepConfig({
      wordList: ["cat", "dog"],
      participationMode: "group",
    });
    expect(cards.wordList).toEqual(["cat", "dog"]);
    expect(cards.participationMode).toBe("group");
  });

  it("drops live game steps without a question set", () => {
    const steps = normalizeClassLessonStepInputs([
      {
        kind: "live_game",
        title: "Game",
        config: { questionSetId: "", questionSetTitle: "Missing" },
      },
      {
        kind: "whiteboard",
        title: "Board",
        config: { title: "Draw" },
      },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.kind).toBe("whiteboard");
  });

  it("keeps live game steps with a question set id", () => {
    const config = normalizeLiveGameStepConfig({
      questionSetId: "qs-1",
      questionSetTitle: "Food A1",
      level: "A1",
    });
    expect(config.questionSetId).toBe("qs-1");
    expect(stepTitleFromConfig("live_game", config)).toBe("Food A1");
  });
});
