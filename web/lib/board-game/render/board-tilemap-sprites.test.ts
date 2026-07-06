import { describe, expect, it } from "vitest";
import { listDefaultMaps } from "@/lib/board-game/map/default-maps";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import {
  resolveTilemapSprites,
  spriteFromTilemapCache,
} from "@/lib/board-game/render/board-tilemap-sprites";

describe("board-tilemap-sprites", () => {
  it("deduplicates terrain and path asset ids", () => {
    const map = listDefaultMaps()[0]!;
    const tilemap = buildBoardTilemap(map);
    const cache = resolveTilemapSprites(tilemap);

    const uniqueTerrain = new Set(tilemap.terrain.flat());
    const uniquePath = new Set(
      tilemap.path.flat().filter((id): id is NonNullable<typeof id> => Boolean(id)),
    );
    expect(cache.size).toBeLessThanOrEqual(uniqueTerrain.size + uniquePath.size);

    for (const id of uniqueTerrain) {
      expect(cache.has(id)).toBe(true);
      expect(spriteFromTilemapCache(cache, id).atlasId).toBe("wke-terrain");
    }
    for (const id of uniquePath) {
      expect(cache.has(id)).toBe(true);
      expect(spriteFromTilemapCache(cache, id).atlasId).toBe("wke-path");
    }
  });

  it("resolves sprites for every default map tilemap", () => {
    for (const map of listDefaultMaps()) {
      const tilemap = buildBoardTilemap(map);
      expect(() => resolveTilemapSprites(tilemap)).not.toThrow();
    }
  });

  it("throws when cache lookup misses", () => {
    const cache = resolveTilemapSprites(
      buildBoardTilemap(listDefaultMaps()[0]!),
    );
    expect(() => spriteFromTilemapCache(cache, "missing_asset")).toThrow(/missing cached sprite/);
  });
});
