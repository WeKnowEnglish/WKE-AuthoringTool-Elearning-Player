import { describe, expect, it } from "vitest";
import { pawnsByPathIndex } from "@/lib/board-game/pawn-utils";
import type { Player } from "@/lib/board-game/types";

const players: Player[] = [
  { id: "p1", name: "Brady", color: "#ef4444" },
  { id: "p2", name: "Beowulf", color: "#8b5cf6" },
  { id: "p3", name: "Ada", color: "#22c55e" },
];

describe("pawnsByPathIndex", () => {
  it("groups multiple players on the same path index", () => {
    const grouped = pawnsByPathIndex(players.slice(0, 2), [0, 0]);

    expect(grouped.get(0)).toEqual([
      { player: players[0], playerIndex: 0, offsetIndex: 0 },
      { player: players[1], playerIndex: 1, offsetIndex: 1 },
    ]);
  });

  it("assigns separate path indices independently", () => {
    const grouped = pawnsByPathIndex(players.slice(0, 2), [2, 5]);

    expect(grouped.get(2)).toEqual([{ player: players[0], playerIndex: 0, offsetIndex: 0 }]);
    expect(grouped.get(5)).toEqual([{ player: players[1], playerIndex: 1, offsetIndex: 0 }]);
  });

  it("sorts stacked pawns by player index for stable layout", () => {
    const grouped = pawnsByPathIndex(players, [3, 3, 3]);

    expect(grouped.get(3)?.map((entry) => entry.playerIndex)).toEqual([0, 1, 2]);
    expect(grouped.get(3)?.map((entry) => entry.offsetIndex)).toEqual([0, 1, 2]);
  });

  it("defaults missing display positions to start", () => {
    const grouped = pawnsByPathIndex(players.slice(0, 1), []);

    expect(grouped.get(0)).toEqual([{ player: players[0], playerIndex: 0, offsetIndex: 0 }]);
  });
});
