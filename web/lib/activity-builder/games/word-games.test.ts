import { describe, expect, it } from "vitest";
import { compileQuizzesFromVocabList } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesWordGameForLessonPlayer } from "@/lib/activity-builder/games/word-games";
import { parseGamesWordGameLessonPlayerPack } from "@/lib/games-word-games/parse-games-pack";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { homeworkCollectionLessonPlayerScreens } from "@/lib/homework-collections/lesson-player-pack";

describe("word-list games", () => {
  it.each(["word", "definition", "example"] as const)("preserves saved %s memory cards in existing homework without an authoring session", (mode) => {
    const list = createBakeryVocabularyListDocument();
    list.entries = list.entries.map((entry) => ({ ...entry, imageUrl: `https://example.com/${entry.id}.png` }));
    const compiled = compileQuizzesFromVocabList({ list, formats: ["memory"], memoryTextMode: mode });
    const pack = exportGamesWordGameForLessonPlayer(compiled.results[0]!.document as never);
    // Assigned homework keeps an exported snapshot; it need not be re-authored.
    const storedPack = JSON.parse(JSON.stringify(pack));
    const view = homeworkCollectionLessonPlayerScreens({
      schemaVersion: 1, id: "already-assigned-memory", kind: "lesson_player_pack",
      title: "Memory homework", instructions: "", required: true,
      studioFormat: "memory", pack: storedPack,
    });
    const screen = parseGamesWordGameLessonPlayerPack({ ...storedPack, screens: [view.screens[0]!.payload] }, "memory").screens[0];
    expect(screen?.subtype).toBe("memory");
    if (screen?.subtype !== "memory") throw new Error("Expected memory homework");
    expect(screen.pairs).toEqual(storedPack.screens[0].pairs);
    expect(screen.pairs.every((pair) => pair.text_kind === mode && pair.text && pair.image_url)).toBe(true);
  });

  it("compiles, exports, and parses all three formats", () => {
    const bakery = createBakeryVocabularyListDocument();
    bakery.entries = bakery.entries.map((entry) => ({
      ...entry,
      imageUrl: `https://example.com/${entry.id}.png`,
    }));
    const result = compileQuizzesFromVocabList({
      list: bakery,
      formats: ["wordsearch", "crossword", "memory"],
      crosswordClueMode: "example",
      memoryTextMode: "definition",
    });
    expect(result.results).toHaveLength(3);
    for (const row of result.results) {
      const pack = exportGamesWordGameForLessonPlayer(row.document as never);
      const parsed = parseGamesWordGameLessonPlayerPack(pack, row.format as "wordsearch" | "crossword" | "memory");
      expect(parsed.screens).toHaveLength(1);
      expect(parsed.screens[0]?.subtype).toBe(row.format);
      if (row.format === "crossword") {
        const screen = parsed.screens[0];
        expect(screen?.subtype).toBe("crossword");
        if (screen?.subtype === "crossword") {
          expect(screen.entries[0]?.clue).toMatch(/bakery|birthday|milk|seven/i);
        }
      }
      if (row.format === "wordsearch") {
        const screen = parsed.screens[0];
        expect(screen?.subtype).toBe("wordsearch");
        if (screen?.subtype === "wordsearch") {
          expect(screen.allow_backwards).toBe(false);
          expect(screen.allow_diagonals).toBe(false);
          expect(screen.allow_backwards_diagonals).toBe(false);
        }
      }
      if (row.format === "memory") {
        const screen = parsed.screens[0];
        expect(screen?.subtype).toBe("memory");
        if (screen?.subtype === "memory") {
          expect(screen.pairs[0]?.text_kind).toBe("definition");
          expect(screen.pairs[0]?.text).toBeTruthy();
          expect(screen.pairs[0]?.image_url).toMatch(/^https:\/\/example\.com\//);
        }
      }
    }
  });

  it("skips Memory entries that cannot form the selected picture pair", () => {
    const bakery = createBakeryVocabularyListDocument();
    bakery.entries[0] = {
      ...bakery.entries[0]!,
      imageUrl: "https://example.com/bread.png",
    };
    bakery.entries[1] = {
      ...bakery.entries[1]!,
      imageUrl: "https://example.com/cake.png",
    };
    const result = compileQuizzesFromVocabList({
      list: bakery,
      formats: ["memory"],
      memoryTextMode: "example",
    });
    expect(result.results[0]?.itemCount).toBe(2);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0]?.reason).toMatch(/picture/i);
  });
});
