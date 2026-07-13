import { describe, expect, it } from "vitest";
import type { LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";
import {
  liveGameQuestionDeckCursorKey,
  pickQuestionFromSessionDeck,
} from "@/lib/live-game/question-deck";

const rows: LiveGameQuestionRow[] = Array.from({ length: 12 }, (_, index) => ({
  id: `question-${index}`,
  setId: "set-a",
  bank: "harvest",
  sortOrder: index,
  prompt: `Question ${index}`,
  payload: {
    type: "multiple_choice",
    options: ["a", "b", "c", "d"],
    correctAnswers: ["a"],
  },
  enabled: true,
  legacySourceId: null,
}));

function deck(roomId: string, count = rows.length) {
  return Array.from({ length: count }, (_, cursor) =>
    pickQuestionFromSessionDeck(rows, {
      roomId,
      playerId: "player-a",
      bank: "harvest",
      cursor,
    }).id,
  );
}

describe("live-game session question decks", () => {
  it("uses every question once before repeating", () => {
    expect(new Set(deck("room-a")).size).toBe(rows.length);
  });

  it("creates a different order for a different room", () => {
    expect(deck("room-a")).not.toEqual(deck("room-b"));
  });

  it("does not repeat the final question at a cycle boundary", () => {
    const sequence = deck("room-a", rows.length + 1);
    expect(sequence.at(-1)).not.toBe(sequence.at(-2));
  });

  it("keeps a separate cursor per player and bank", () => {
    expect(liveGameQuestionDeckCursorKey("player-a", "harvest")).toBe("player-a:harvest");
    expect(liveGameQuestionDeckCursorKey("player-a", "craft")).toBe("player-a:craft");
  });
});
