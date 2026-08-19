import { describe, expect, it } from "vitest";
import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesWordGameForLessonPlayer } from "@/lib/activity-builder/games/word-games";
import { parseGamesWordGameLessonPlayerPack } from "@/lib/games-word-games/parse-games-pack";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";

describe("word-list games", () => {
  it("compiles, exports, and parses all three formats", () => {
    const result = compileQuizzesFromVocabList({
      list: createBakeryVocabularyListDocument(),
      formats: ["wordsearch", "crossword", "memory"],
    });
    expect(result.results).toHaveLength(3);
    for (const row of result.results) {
      const pack = exportGamesWordGameForLessonPlayer(row.document as never);
      const parsed = parseGamesWordGameLessonPlayerPack(pack, row.format as "wordsearch" | "crossword" | "memory");
      expect(parsed.screens).toHaveLength(1);
      expect(parsed.screens[0]?.subtype).toBe(row.format);
    }
  });
});
