import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesMcQuizForLessonPlayer } from "@/lib/activity-builder/games/mc-quiz";
import { exportGamesLetterMixupForLessonPlayer } from "@/lib/activity-builder/games/letter-mixup";
import { exportGamesFlashcardsForLessonPlayer } from "@/lib/activity-builder/games/flashcards";
import type { GamesAuthoringDocument } from "@/lib/activity-builder/games/types-mc";
import type { GamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/types-letter-mixup";

describe("compileQuizzesFromVocabList", () => {
  it("compiles MCQ, letter scramble, and flashcards from bakery list", () => {
    const list = createBakeryVocabularyListDocument();
    const output = compileQuizzesFromVocabList({
      list,
      formats: ["multiple_choice", "letter_mixup", "flashcards"],
    });

    expect(output.results).toHaveLength(3);

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
});
