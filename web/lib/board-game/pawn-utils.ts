import type { Player } from "@/lib/board-game/types";

export type PawnOnTile = {
  player: Player;
  playerIndex: number;
  offsetIndex: number;
};

export function pawnsByPathIndex(
  players: Player[],
  displayPositions: number[],
): Map<number, PawnOnTile[]> {
  const grouped = new Map<number, { player: Player; playerIndex: number }[]>();

  players.forEach((player, playerIndex) => {
    const pathIndex = displayPositions[playerIndex] ?? 0;
    const list = grouped.get(pathIndex) ?? [];
    list.push({ player, playerIndex });
    grouped.set(pathIndex, list);
  });

  const result = new Map<number, PawnOnTile[]>();

  for (const [pathIndex, entries] of grouped) {
    const sorted = [...entries].sort((a, b) => a.playerIndex - b.playerIndex);
    result.set(
      pathIndex,
      sorted.map((entry, offsetIndex) => ({
        player: entry.player,
        playerIndex: entry.playerIndex,
        offsetIndex,
      })),
    );
  }

  return result;
}
