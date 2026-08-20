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
      const start = placement.cells[0]!;
      const end = placement.cells.at(-1)!;
      const direction = `${Math.sign(end.row - start.row)},${Math.sign(end.col - start.col)}`;
      expect(["0,1", "1,0"]).toContain(direction);
    }
  });

  it("uses harder word-search directions only when teachers enable them", () => {
    const puzzle = buildWordSearch({
      words: Array.from({ length: 12 }, (_, index) => ({
        id: `word-${index}`,
        word: `word${String.fromCharCode(97 + index)}`,
      })),
      size: 14,
      seed: "all-directions",
      allowBackwards: true,
      allowDiagonals: true,
      allowBackwardsDiagonals: true,
    });
    const directions = new Set(
      puzzle.placements.map((placement) => {
        const start = placement.cells[0]!;
        const end = placement.cells.at(-1)!;
        return `${Math.sign(end.row - start.row)},${Math.sign(end.col - start.col)}`;
      }),
    );
    expect([...directions].some((direction) => direction.startsWith("-1,"))).toBe(true);
    expect([...directions].some((direction) => direction === "1,1" || direction === "1,-1")).toBe(true);
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
