import type { SuperlativeScale } from "@/lib/exercise/superlative-scales";

export const EXERCISE_LADDER_URL = "/pet/exercise/ladder.svg";
export const EXERCISE_TILE_PLACEHOLDER_URL = "/pet/exercise/tile-placeholder.svg";
export const EXERCISE_GROUND_URL = "/pet/exercise/ground.svg";

export const EXERCISE_PRELOAD_URLS = [
  EXERCISE_LADDER_URL,
  EXERCISE_TILE_PLACEHOLDER_URL,
  EXERCISE_GROUND_URL,
] as const;

export type ExerciseTile = {
  id: string;
  label: string;
  imageUrl: string;
};

export function tilesForScale(scale: SuperlativeScale): ExerciseTile[] {
  return scale.words.map((word) => ({
    id: word,
    label: word,
    imageUrl: EXERCISE_TILE_PLACEHOLDER_URL,
  }));
}

export function getExerciseTile(
  tiles: ExerciseTile[],
  id: string,
): ExerciseTile | undefined {
  return tiles.find((t) => t.id === id);
}

export function tileMatches(pick: string, expectedWord: string): boolean {
  return pick.trim().toLowerCase() === expectedWord.trim().toLowerCase();
}
