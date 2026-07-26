import { describe, expect, it } from "vitest";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { buildQuizPacksFromVocabList } from "@/lib/activity-library/compile-quizzes-from-vocab-studio";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import { parseGamesLetterMixupLessonPlayerPack } from "@/lib/games-letter-mixup/parse-games-pack";
import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";

describe("buildQuizPacksFromVocabList", () => {
  it("builds three Activity Bank–ready lesson packs from the bakery list", () => {
    const list = createBakeryVocabularyListDocument();
    const built = buildQuizPacksFromVocabList({
      list,
      formats: ["multiple_choice", "letter_mixup", "flashcards"],
    });

    expect(built.packs).toHaveLength(3);

    const mc = built.packs.find((row) => row.format === "multiple_choice");
    expect(mc?.itemCount).toBe(4);
    expect(parseGamesMcQuizLessonPlayerPack(mc!.pack).screens[0]?.subtype).toBe(
      "mc_quiz",
    );

    const letter = built.packs.find((row) => row.format === "letter_mixup");
    expect(letter?.itemCount).toBe(4);
    expect(
      parseGamesLetterMixupLessonPlayerPack(letter!.pack).screens[0]?.subtype,
    ).toBe("letter_mixup");

    const cards = built.packs.find((row) => row.format === "flashcards");
    expect(cards?.itemCount).toBe(4);
    expect(
      parseGamesFlashcardsLessonPlayerPack(cards!.pack).screens.length,
    ).toBeGreaterThan(0);
  });
});
