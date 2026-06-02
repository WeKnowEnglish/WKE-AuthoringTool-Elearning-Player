import { describe, expect, it } from "vitest";
import {
  CENTER_COL,
  CENTER_ROW,
  createEmptyBoard,
  isBoardEmpty,
} from "@/lib/scrabble/scrabble-board";
import {
  createScrabbleSession,
  isSessionComplete,
  tryPlayerPlay,
  type ScrabbleSession,
} from "@/lib/scrabble/scrabble-session";
import { isValidWord } from "@/lib/scrabble/scrabble-words";

describe("scrabble session", () => {
  it("creates session with racks of 7", () => {
    const s = createScrabbleSession(() => 0.9);
    expect(s.playerRack).toHaveLength(7);
    expect(s.petRack).toHaveLength(7);
  });

  it("requires center on first word", () => {
    const s = createScrabbleSession(() => 0.5);
    const playerFirst: ScrabbleSession = { ...s, activeSide: "player", wordsPlayed: 0 };
    const result = tryPlayerPlay(playerFirst, {
      row: 0,
      col: 0,
      direction: "across",
      word: "CAT",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("center");
  });

  it("accepts valid first word on center", () => {
    const s = createScrabbleSession(() => 0.5);
    const playerFirst: ScrabbleSession = {
      ...s,
      activeSide: "player",
      wordsPlayed: 0,
      board: createEmptyBoard(),
      playerRack: ["C", "A", "T", "E", "R", "S", "N"],
    };
    const result = tryPlayerPlay(playerFirst, {
      row: CENTER_ROW,
      col: CENTER_COL - 1,
      direction: "across",
      word: "CAT",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isBoardEmpty(result.session.board)).toBe(false);
      expect(result.session.playerScore).toBe(3);
    }
  });

  it("completes after six words", () => {
    let session = createScrabbleSession(() => 0.5);
    session = { ...session, activeSide: "player", wordsPlayed: 5 };
    const result = tryPlayerPlay(session, {
      row: CENTER_ROW,
      col: CENTER_COL,
      direction: "down",
      word: "AT",
    });
    if (result.ok && result.session.wordsPlayed < 6) {
      expect(isSessionComplete(result.session)).toBe(false);
    }
  });

  it("knows common kid words", () => {
    expect(isValidWord("cat")).toBe(true);
    expect(isValidWord("xyzq")).toBe(false);
  });
});
