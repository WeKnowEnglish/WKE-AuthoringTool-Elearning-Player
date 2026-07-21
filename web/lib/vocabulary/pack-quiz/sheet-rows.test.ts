import { describe, expect, it } from "vitest";
import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";
import {
  packQuizMcModeLabel,
  packQuizQuestionsToSheetRows,
  preservePromptImagesByWordId,
  sheetRowsToPackQuizQuestions,
} from "@/lib/vocabulary/pack-quiz/sheet-rows";

function mcQuestion(
  partial: Partial<PackQuizCompiledQuestion> &
    Pick<PackQuizCompiledQuestion, "id" | "wordId" | "mode">,
): PackQuizCompiledQuestion {
  return {
    payload: {
      type: "interaction",
      subtype: "mc_quiz",
      question: "Which word?",
      options: [
        { id: "a", label: "cat" },
        { id: "b", label: "dog" },
        { id: "c", label: "bird" },
        { id: "d", label: "fish" },
      ],
      correct_option_id: "a",
      shuffle_options: false,
    },
    ...partial,
  };
}

describe("packQuizQuestionsToSheetRows", () => {
  it("flattens MC options into correct + three wrongs", () => {
    const rows = packQuizQuestionsToSheetRows([
      mcQuestion({
        id: "q1",
        wordId: "w1",
        mode: "word_for_meaning_en",
        payload: {
          type: "interaction",
          subtype: "mc_quiz",
          question: "Which word matches?\nmeows",
          image_url: "https://example.com/cat.png",
          image_fit: "contain",
          options: [
            { id: "b", label: "dog" },
            { id: "a", label: "cat" },
            { id: "c", label: "bird" },
            { id: "d", label: "fish" },
          ],
          correct_option_id: "a",
          shuffle_options: false,
        },
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "q1",
      wordId: "w1",
      mode: "word_for_meaning_en",
      prompt: "Which word matches?\nmeows",
      promptImageUrl: "https://example.com/cat.png",
      correct: "cat",
      wrongs: ["dog", "bird", "fish"],
    });
  });

  it("pads missing wrongs", () => {
    const rows = packQuizQuestionsToSheetRows([
      mcQuestion({
        id: "q2",
        wordId: "w2",
        mode: "find_lemma",
        payload: {
          type: "interaction",
          subtype: "mc_quiz",
          question: "Find cat",
          options: [
            { id: "a", label: "cat" },
            { id: "b", label: "dog" },
          ],
          correct_option_id: "a",
          shuffle_options: false,
        },
      }),
    ]);
    expect(rows[0]?.wrongs).toEqual(["dog", "", ""]);
    expect(rows[0]?.promptImageUrl).toBe("");
  });

  it("labels modes for the sheet", () => {
    expect(packQuizMcModeLabel("meaning_for_word_en")).toBe("Word → meaning");
  });

  it("round-trips sheet edits including prompt image_url", () => {
    const built = sheetRowsToPackQuizQuestions([
      {
        id: "q1",
        wordId: "w1",
        mode: "word_for_meaning_en",
        prompt: "Which word?\nmeows",
        promptImageUrl: "https://cdn.example/cat.webp",
        correct: "cat",
        wrongs: ["dog", "bird", "fish"],
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.questions[0]?.payload.correct_option_id).toBe("a");
    expect(built.questions[0]?.payload.image_url).toBe("https://cdn.example/cat.webp");
    expect(built.questions[0]?.payload.options.map((o) => o.label)).toEqual([
      "cat",
      "dog",
      "bird",
      "fish",
    ]);
  });

  it("omits image_url when prompt image is blank", () => {
    const built = sheetRowsToPackQuizQuestions([
      {
        id: "q1",
        wordId: "w1",
        mode: "find_lemma",
        prompt: "Find cat",
        promptImageUrl: "  ",
        correct: "cat",
        wrongs: ["dog", "bird", "fish"],
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.questions[0]?.payload.image_url).toBeUndefined();
  });

  it("rejects incomplete sheet rows", () => {
    const built = sheetRowsToPackQuizQuestions([
      {
        id: "q1",
        wordId: "w1",
        mode: "find_lemma",
        prompt: "Find",
        promptImageUrl: "",
        correct: "cat",
        wrongs: ["dog", "", "fish"],
      },
    ]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error).toMatch(/wrong answers/i);
  });

  it("preserves prompt images by wordId across regenerate", () => {
    const previous = [
      mcQuestion({
        id: "old-w1",
        wordId: "w1",
        mode: "find_lemma",
        payload: {
          type: "interaction",
          subtype: "mc_quiz",
          question: "old",
          image_url: "https://cdn.example/keep.png",
          image_fit: "contain",
          options: [
            { id: "a", label: "cat" },
            { id: "b", label: "dog" },
            { id: "c", label: "bird" },
            { id: "d", label: "fish" },
          ],
          correct_option_id: "a",
          shuffle_options: false,
        },
      }),
    ];
    const next = [
      mcQuestion({
        id: "new-w1",
        wordId: "w1",
        mode: "word_for_meaning_en",
      }),
      mcQuestion({
        id: "new-w2",
        wordId: "w2",
        mode: "find_lemma",
      }),
    ];
    const merged = preservePromptImagesByWordId(next, previous);
    expect(merged[0]?.payload.image_url).toBe("https://cdn.example/keep.png");
    expect(merged[1]?.payload.image_url).toBeUndefined();
  });
});
