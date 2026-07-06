import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import {
  resolvePathTile,
  resolveTerrainTile,
  type ResolvedBoardSprite,
} from "@/lib/topdown/resolve-sprite-bounds";

export type ResolvedTilemapSprites = Map<string, ResolvedBoardSprite>;

export function resolveTilemapSprites(tilemap: BoardTilemap): ResolvedTilemapSprites {
  const cache: ResolvedTilemapSprites = new Map();

  for (const row of tilemap.terrain) {
    for (const id of row) {
      if (!cache.has(id)) {
        cache.set(id, resolveTerrainTile(id));
      }
    }
  }

  for (const row of tilemap.path) {
    for (const id of row) {
      if (id && !cache.has(id)) {
        cache.set(id, resolvePathTile(id));
      }
    }
  }

  return cache;
}

export function spriteFromTilemapCache(
  cache: ResolvedTilemapSprites,
  assetId: string,
): ResolvedBoardSprite {
  const sprite = cache.get(assetId);
  if (!sprite) {
    throw new Error(`resolveTilemapSprites: missing cached sprite for ${assetId}`);
  }
  return sprite;
}
