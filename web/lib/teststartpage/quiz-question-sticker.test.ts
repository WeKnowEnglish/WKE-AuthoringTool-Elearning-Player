import { describe, expect, it } from "vitest";
import type { TestStartQuizQuestion } from "@/lib/curated-sentences/quiz-compiler";
import { pickQuizStickerVisual } from "./quiz-question-sticker";

describe("pickQuizStickerVisual", () => {
  it("uses word→emoji for chair letter_mixup when no sticker name matches", () => {
    const q = {
      type: "interaction",
      subtype: "letter_mixup",
      prompt: "Spell the word.",
      shuffle_letters: true,
      case_sensitive: false,
      items: [{ id: "1", target_word: "chair", accepted_words: ["chair"] }],
      guide: {},
    } as const satisfies TestStartQuizQuestion;
    const v = pickQuizStickerVisual(q, "seed-a", 0);
    expect(v.emoji).toBe("🪑");
    expect(v.label.toLowerCase()).toContain("chair");
  });

  it("matches milk fill-blank to milk emoji", () => {
    const q = {
      type: "interaction",
      subtype: "fill_blanks",
      template: "The cat drinks __1__.",
      blanks: [{ id: "1", acceptable: ["milk", "Milk"] }],
      guide: {},
    } as const satisfies TestStartQuizQuestion;
    const v = pickQuizStickerVisual(q, "seed-b", 2);
    expect(v.emoji).toBe("🥛");
  });

  it("uses correct MCQ option for visual (rainy)", () => {
    const q = {
      type: "interaction",
      subtype: "mc_quiz",
      question: "It is ________ today.",
      options: [
        { id: "a", label: "sunny" },
        { id: "b", label: "rainy" },
        { id: "c", label: "apple" },
        { id: "d", label: "chair" },
      ],
      correct_option_id: "b",
      shuffle_options: false,
      guide: {},
    } as const satisfies TestStartQuizQuestion;
    const v = pickQuizStickerVisual(q, "seed-c", 1);
    expect(v.emoji).toBe("🌧️");
  });
});
