import { describe, expect, it } from "vitest";
import {
  exportGamesSentenceScrambleForLessonPlayer,
  validateGamesSentenceScrambleAuthoringDocument,
} from "@/lib/activity-builder/games/sentence-scramble";
import type { GamesSentenceScrambleAuthoringDocument } from "@/lib/activity-builder/games/types-sentence-scramble";

function documentWithItem(
  item: GamesSentenceScrambleAuthoringDocument["interaction"]["items"][number],
): GamesSentenceScrambleAuthoringDocument {
  return {
    version: 1,
    kind: "activity-authoring",
    id: "scramble-test",
    name: "Sentence scramble test",
    educationalIntent: {
      objective: "Build a complete sentence.",
      successCriteria: "Students arrange every tile correctly.",
    },
    content: { instruction: "Put the words in order." },
    interaction: {
      type: "games",
      format: "sentence_scramble",
      quizGroupId: "scramble-test",
      quizGroupTitle: "Sentence scramble test",
      bodyTextDefault: "Put the words in order.",
      items: [item],
    },
  };
}

describe("sentence scramble prompt modes", () => {
  it("uses the correct sentence as the scramble with the standard instruction", () => {
    const pack = exportGamesSentenceScrambleForLessonPlayer(
      documentWithItem({
        id: "plain",
        promptMode: "scramble_only",
        correctOrder: ["She", "likes", "music."],
      }),
    );

    expect(pack.screens[0]?.body_text).toBe("Put the words in order.");
    expect(pack.screens[0]?.correct_order).toEqual(["She", "likes", "music."]);
  });

  it("shows a separate prompt while grading the expanded correct sentence", () => {
    const pack = exportGamesSentenceScrambleForLessonPlayer(
      documentWithItem({
        id: "expanded",
        promptMode: "additional_prompt",
        bodyText: "Expand this idea: She likes music.",
        correctOrder: ["She", "really", "likes", "listening", "to", "music."],
      }),
    );

    expect(pack.screens[0]?.body_text).toBe(
      "Expand this idea: She likes music.",
    );
    expect(pack.screens[0]?.correct_order.join(" ")).toBe(
      "She really likes listening to music.",
    );
  });

  it("infers additional-prompt mode for legacy items with body text", () => {
    const validated = validateGamesSentenceScrambleAuthoringDocument(
      documentWithItem({
        id: "legacy",
        bodyText: "Make this sentence more detailed.",
        correctOrder: ["The", "small", "dog", "ran", "quickly."],
      }),
    );

    expect(validated.interaction.items[0]?.promptMode).toBe(
      "additional_prompt",
    );
  });
});
