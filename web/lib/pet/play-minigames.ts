export type PlayMiniGameId = "climb" | "scrabble" | "memory" | "game4";

/** Wired in PetRoom — add game4 here when implemented. */
export const IMPLEMENTED_PLAY_MINIGAMES: readonly PlayMiniGameId[] = [
  "climb",
  "scrabble",
  "memory",
] as const;

/**
 * Picks one play mini-game at random (equal weight among implemented games).
 * Expand IMPLEMENTED_PLAY_MINIGAMES to four entries when game4 ships.
 */
export function pickPlayMiniGame(
  random: () => number = Math.random,
): PlayMiniGameId {
  const pool = IMPLEMENTED_PLAY_MINIGAMES;
  const index = Math.floor(random() * pool.length);
  return pool[Math.min(index, pool.length - 1)]!;
}
