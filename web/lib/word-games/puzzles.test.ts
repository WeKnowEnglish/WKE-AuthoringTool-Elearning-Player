import { describe, expect, it } from "vitest";
import { buildCrossword, buildWordSearch, puzzleLetters } from "@/lib/word-games/puzzles";

describe("word-game puzzle generation", () => {
  it("places every word-search word in a deterministic grid", () => {
    const input = {
      words: [
        { id: "apple", word: "apple" },
        { id: "banana", word: "banana" },
        { id: "orange", word: "orange" },
      ],
      size: 10,
      seed: "fruit",
    };
    const first = buildWordSearch(input);
    const second = buildWordSearch(input);
    expect(first).toEqual(second);
    expect(first.placements).toHaveLength(3);
    for (const placement of first.placements) {
      const letters = placement.cells.map((cell) => first.grid[cell.row]![cell.col]).join("");
      expect(letters).toBe(puzzleLetters(placement.word));
    }
  });

  it("keeps entries without shared letters in the crossword", () => {
    const puzzle = buildCrossword([
      { id: "cat", answer: "cat", clue: "A pet." },
      { id: "dog", answer: "dog", clue: "Another pet." },
      { id: "fish", answer: "fish", clue: "It swims." },
    ]);
    expect(puzzle.entries.map((entry) => entry.id).sort()).toEqual(["cat", "dog", "fish"]);
    expect(puzzle.cells.length).toBeGreaterThan(0);
    expect(puzzle.rows).toBeGreaterThan(0);
    expect(puzzle.cols).toBeGreaterThan(0);
  });
});
