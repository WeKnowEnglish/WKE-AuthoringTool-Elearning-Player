import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesMcQuizForLessonPlayer } from "@/lib/activity-builder/games/mc-quiz";
import { exportGamesLetterMixupForLessonPlayer } from "@/lib/activity-builder/games/letter-mixup";
import { exportGamesFlashcardsForLessonPlayer } from "@/lib/activity-builder/games/flashcards";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import type { GamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/types-letter-mixup";

describe("compileQuizzesFromVocabList", () => {
  it("compiles MCQ, letter scramble, flashcards, and slice-2 formats from bakery list", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: [
        "multiple_choice",
        "letter_mixup",
        "flashcards",
        "listen_and_choose",
        "line_match",
        "true_false",
        "sentence_scramble",
        "fill_blanks",
      ],
    });

    expect(output.results).toHaveLength(8);

    const mc = output.results.find((row) => row.format === "multiple_choice");
    expect(mc?.itemCount).toBe(4);
    const mcPack = exportGamesMcQuizForLessonPlayer(mc!.document as never);
    expect(mcPack.screens[0]?.subtype).toBe("mc_quiz");

    const letter = output.results.find((row) => row.format === "letter_mixup");
    expect(letter?.itemCount).toBe(4);
    const letterPack = exportGamesLetterMixupForLessonPlayer(letter!.document as never);
    expect(letterPack.screens[0]?.subtype).toBe("letter_mixup");
    expect(letterPack.screens[0]?.auto_advance_on_pass).toBe(true);

    const cards = output.results.find((row) => row.format === "flashcards");
    expect(cards?.itemCount).toBe(4);
    const cardPack = exportGamesFlashcardsForLessonPlayer(cards!.document as never);
    expect(cardPack.screens.length).toBeGreaterThan(0);

    expect(output.results.find((row) => row.format === "listen_and_choose")?.itemCount).toBe(4);
    expect(output.results.find((row) => row.format === "line_match")?.itemCount).toBe(1);
    expect(output.results.find((row) => row.format === "true_false")?.itemCount).toBe(4);
    expect(output.results.find((row) => row.format === "sentence_scramble")?.itemCount).toBe(4);
    expect(output.results.find((row) => row.format === "fill_blanks")?.itemCount).toBe(4);
  });

  it("applies MC and letter scramble activity settings", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice", "letter_mixup"],
      mcMasterQuestion: "Which word is this?",
      mcOptionCount: 3,
      mcShuffleOptions: false,
      letterPrompt: "Fix the letters.",
      letterShuffleLetters: false,
      letterCaseSensitive: true,
    });

    const mc = output.results.find((row) => row.format === "multiple_choice")
      ?.document as GamesAuthoringDocument;
    expect(mc.interaction.shuffleOptionsDefault).toBe(false);
    expect(mc.interaction.items[0]?.question).toBe("Which word is this?");
    expect(mc.interaction.items[0]?.options).toHaveLength(3);

    const letter = output.results.find((row) => row.format === "letter_mixup")
      ?.document as GamesLetterMixupAuthoringDocument;
    expect(letter.interaction.promptDefault).toBe("Fix the letters.");
    expect(letter.interaction.shuffleLettersDefault).toBe(false);
    expect(letter.interaction.caseSensitiveDefault).toBe(true);
  });

  it("keeps random-ish ids when mcStableItems is omitted", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice"],
    });
    const mc = output.results[0]?.document as GamesAuthoringDocument;
    expect(mc.interaction.items[0]?.id).toBe("q1");
  });

  it("prefers example audio for listen dialog when an example is present", () => {
    const list = createBakeryVocabularyListDocument();
    list.entries[0] = {
      ...list.entries[0]!,
      audioUrl: "https://cdn.example/bread-word.m4a",
      exampleAudioUrl: "https://cdn.example/bread-example.m4a",
    };
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["listen_and_choose"],
    });
    const listen = output.results[0]?.document as {
      interaction: {
        items: Array<{ dialogText?: string; promptAudioUrl?: string }>;
      };
    };
    const item = listen.interaction.items.find((row) =>
      row.dialogText?.includes("bread"),
    );
    expect(item?.promptAudioUrl).toBe("https://cdn.example/bread-example.m4a");
  });
});
