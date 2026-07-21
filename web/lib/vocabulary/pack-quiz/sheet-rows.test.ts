import { describe, expect, it } from "vitest";
import type {
  PackQuizLetterScrambleCompiledQuestion,
  PackQuizMcCompiledQuestion,
  PackQuizSentenceScrambleCompiledQuestion,
  PackQuizTrueFalseCompiledQuestion,
} from "@/lib/vocabulary/pack-quiz";
import {
  packQuizMcModeLabel,
  packQuizQuestionsToLetterSheetRows,
  packQuizQuestionsToSentenceSheetRows,
  packQuizQuestionsToSheetRows,
  packQuizQuestionsToTfSheetRows,
  preservePromptImagesByWordId,
  sheetLetterRowsToPackQuizQuestions,
  sheetRowsToPackQuizQuestions,
  sheetSentenceRowsToPackQuizQuestions,
  sheetTfRowsToPackQuizQuestions,
} from "@/lib/vocabulary/pack-quiz/sheet-rows";

function mcQuestion(
  partial: Partial<PackQuizMcCompiledQuestion> &
    Pick<PackQuizMcCompiledQuestion, "id" | "wordId" | "mode">,
): PackQuizMcCompiledQuestion {
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
    format: "multiple_choice",
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

  it("round-trips true/false sheet edits", () => {
    const built = sheetTfRowsToPackQuizQuestions([
      {
        id: "tf1",
        wordId: "w1",
        statement: "This is a cat.",
        correct: true,
        promptImageUrl: "https://cdn.example/cat.webp",
        truthStatement: "This is a cat.",
      },
      {
        id: "tf2",
        wordId: "w2",
        statement: "This is a bird.",
        correct: false,
        promptImageUrl: "",
        truthStatement: "This is a dog.",
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.questions).toHaveLength(2);
    expect(built.questions[0]?.payload.image_url).toBe("https://cdn.example/cat.webp");
    expect(built.questions[1]?.payload.correct).toBe(false);
    expect(built.questions[1]?.payload.picture_truth_statement).toBe("This is a dog.");

    const rows = packQuizQuestionsToTfSheetRows(built.questions);
    expect(rows[0]?.statement).toBe("This is a cat.");
    expect(rows[1]?.correct).toBe(false);
  });

  it("rejects empty true/false statements", () => {
    const built = sheetTfRowsToPackQuizQuestions([
      {
        id: "tf1",
        wordId: "w1",
        statement: "  ",
        correct: true,
        promptImageUrl: "",
        truthStatement: "",
      },
    ]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error).toMatch(/statement/i);
  });

  it("round-trips letter scramble sheet edits", () => {
    const built = sheetLetterRowsToPackQuizQuestions([
      {
        id: "ls1",
        wordId: "w1",
        prompt: "Spell the word.",
        targetWord: "cat",
        promptImageUrl: "https://cdn.example/cat.webp",
        extraAccepted: "kitty",
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.questions[0]?.format).toBe("letter_scramble");
    expect(built.questions[0]?.payload.subtype).toBe("letter_mixup");
    expect(built.questions[0]?.payload.items[0]?.target_word).toBe("cat");
    expect(built.questions[0]?.payload.items[0]?.accepted_words).toEqual([
      "cat",
      "kitty",
    ]);
    expect(built.questions[0]?.payload.image_url).toBe("https://cdn.example/cat.webp");

    const rows = packQuizQuestionsToLetterSheetRows(built.questions);
    expect(rows[0]?.targetWord).toBe("cat");
    expect(rows[0]?.extraAccepted).toBe("kitty");
  });

  it("rejects letter scramble targets that are too short", () => {
    const built = sheetLetterRowsToPackQuizQuestions([
      {
        id: "ls1",
        wordId: "w1",
        prompt: "Spell the word.",
        targetWord: "I",
        promptImageUrl: "",
        extraAccepted: "",
      },
    ]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error).toMatch(/2 letters/i);
  });

  it("round-trips sentence scramble sheet edits", () => {
    const built = sheetSentenceRowsToPackQuizQuestions([
      {
        id: "ss1",
        wordId: "w1",
        sentence: "I see a white cat.",
        bodyText: "Put the words in order.",
        promptImageUrl: "https://cdn.example/cat.webp",
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.questions[0]?.format).toBe("sentence_scramble");
    expect(built.questions[0]?.payload.subtype).toBe("drag_sentence");
    expect(built.questions[0]?.payload.correct_order).toEqual([
      "I",
      "see",
      "a",
      "white",
      "cat.",
    ]);
    expect(built.questions[0]?.payload.image_url).toBe("https://cdn.example/cat.webp");

    const rows = packQuizQuestionsToSentenceSheetRows(built.questions);
    expect(rows[0]?.sentence).toBe("I see a white cat.");
  });

  it("rejects sentence scramble with fewer than 2 tokens", () => {
    const built = sheetSentenceRowsToPackQuizQuestions([
      {
        id: "ss1",
        wordId: "w1",
        sentence: "Hello",
        bodyText: "",
        promptImageUrl: "",
      },
    ]);
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.error).toMatch(/2 words/i);
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

    const tfPrevious: PackQuizTrueFalseCompiledQuestion[] = [
      {
        id: "old-tf",
        wordId: "w1",
        format: "true_false",
        payload: {
          type: "interaction",
          subtype: "true_false",
          statement: "This is a cat.",
          correct: true,
          image_url: "https://cdn.example/tf-keep.png",
          image_fit: "contain",
        },
      },
    ];
    const tfNext: PackQuizTrueFalseCompiledQuestion[] = [
      {
        id: "new-tf",
        wordId: "w1",
        format: "true_false",
        payload: {
          type: "interaction",
          subtype: "true_false",
          statement: "This is a cat.",
          correct: true,
          image_fit: "contain",
        },
      },
    ];
    expect(preservePromptImagesByWordId(tfNext, tfPrevious)[0]?.payload.image_url).toBe(
      "https://cdn.example/tf-keep.png",
    );

    const letterPrevious: PackQuizLetterScrambleCompiledQuestion[] = [
      {
        id: "old-ls",
        wordId: "w1",
        format: "letter_scramble",
        payload: {
          type: "interaction",
          subtype: "letter_mixup",
          prompt: "Spell the word.",
          items: [{ id: "w1", target_word: "cat", accepted_words: ["cat", "Cat"] }],
          image_url: "https://cdn.example/ls-keep.png",
          image_fit: "contain",
          shuffle_letters: true,
          case_sensitive: false,
          image_use_tts: true,
        },
      },
    ];
    const letterNext: PackQuizLetterScrambleCompiledQuestion[] = [
      {
        id: "new-ls",
        wordId: "w1",
        format: "letter_scramble",
        payload: {
          type: "interaction",
          subtype: "letter_mixup",
          prompt: "Spell the word.",
          items: [{ id: "w1", target_word: "cat", accepted_words: ["cat", "Cat"] }],
          image_fit: "contain",
          shuffle_letters: true,
          case_sensitive: false,
          image_use_tts: true,
        },
      },
    ];
    expect(preservePromptImagesByWordId(letterNext, letterPrevious)[0]?.payload.image_url).toBe(
      "https://cdn.example/ls-keep.png",
    );

    const sentencePrevious: PackQuizSentenceScrambleCompiledQuestion[] = [
      {
        id: "old-ss",
        wordId: "w1",
        format: "sentence_scramble",
        payload: {
          type: "interaction",
          subtype: "drag_sentence",
          body_text: "Put the words in order.",
          sentence_slots: ["", "", ""],
          word_bank: ["I", "like", "cats."],
          correct_order: ["I", "like", "cats."],
          image_url: "https://cdn.example/ss-keep.png",
          image_fit: "contain",
        },
      },
    ];
    const sentenceNext: PackQuizSentenceScrambleCompiledQuestion[] = [
      {
        id: "new-ss",
        wordId: "w1",
        format: "sentence_scramble",
        payload: {
          type: "interaction",
          subtype: "drag_sentence",
          body_text: "Put the words in order.",
          sentence_slots: ["", "", ""],
          word_bank: ["I", "like", "cats."],
          correct_order: ["I", "like", "cats."],
          image_fit: "contain",
        },
      },
    ];
    expect(
      preservePromptImagesByWordId(sentenceNext, sentencePrevious)[0]?.payload.image_url,
    ).toBe("https://cdn.example/ss-keep.png");
  });
});
