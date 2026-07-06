import { describe, expect, it } from "vitest";
import { walkBottom } from "@/lib/topdown/atlas-tile-layout";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import { fillerTileForTheme } from "@/lib/board-game/render/terrain-tiles";
import { listDefaultMaps } from "@/lib/board-game/map/default-maps";
import type { MapThemeId } from "@/lib/board-game/map/types";
import {
  assertBoardTilemapResolvable,
  atlasIdForAsset,
  BOARD_TILE_LOGICAL_PX,
  isBoardAtlasId,
  resolveBoardSprite,
  resolvePathTile,
  resolveSpriteBounds,
  resolveStackPreset,
  resolveTerrainTile,
  SpriteResolveError,
} from "@/lib/topdown/resolve-sprite-bounds";
import { listWkePathTileIds } from "@/lib/topdown/wke-path-tile-presets";
import { listWkeTerrainTileIds } from "@/lib/topdown/wke-terrain-tile-presets";
import {
  WKE_PATH_SPRITE_ATLAS,
  WKE_TERRAIN_SPRITE_ATLAS,
} from "@/lib/topdown/wke-sprite-atlas";

const THEMES: MapThemeId[] = ["classroom", "jungle", "space", "ocean", "castle"];

describe("resolve-sprite-bounds", () => {
  it("routes asset ids to the correct atlas", () => {
    expect(atlasIdForAsset("wke_grass_plain")).toBe("wke-terrain");
    expect(atlasIdForAsset("path_r2c1")).toBe("wke-path");
    expect(atlasIdForAsset("garden_plot")).toBeUndefined();
  });

  it("identifies board atlas ids", () => {
    expect(isBoardAtlasId("wke-terrain")).toBe(true);
    expect(isBoardAtlasId("wke-path")).toBe(true);
    expect(isBoardAtlasId("garden")).toBe(false);
  });

  it("resolves every committed terrain asset", () => {
    for (const assetId of Object.keys(WKE_TERRAIN_SPRITE_ATLAS.assets)) {
      const bounds = resolveSpriteBounds("wke-terrain", assetId);
      expect(bounds.sw).toBeGreaterThan(0);
      expect(bounds.sh).toBeGreaterThan(0);
    }
  });

  it("resolves every committed path asset", () => {
    for (const assetId of Object.keys(WKE_PATH_SPRITE_ATLAS.assets)) {
      const bounds = resolveSpriteBounds("wke-path", assetId);
      expect(bounds.sw).toBeGreaterThan(0);
      expect(bounds.sh).toBeGreaterThan(0);
    }
  });

  it("throws SpriteResolveError for missing assets", () => {
    expect(() => resolveSpriteBounds("wke-terrain", "missing_tile")).toThrow(SpriteResolveError);
    expect(() => resolveSpriteBounds("wke-path", "missing_tile")).toThrow(SpriteResolveError);
  });

  it("resolveTerrainTile matches atlas lookup + stack preset", () => {
    const assetId = "wke_grass_plain_2";
    const resolved = resolveTerrainTile(assetId);
    expect(resolved.atlasId).toBe("wke-terrain");
    expect(resolved.bounds).toEqual(WKE_TERRAIN_SPRITE_ATLAS.assets[assetId]);
    expect(resolved.stack.layout.logicalTilePx).toBeGreaterThan(0);
  });

  it("resolvePathTile matches atlas lookup + stack preset", () => {
    const assetId = "path_r1c2";
    const resolved = resolvePathTile(assetId);
    expect(resolved.atlasId).toBe("wke-path");
    expect(resolved.bounds).toEqual(WKE_PATH_SPRITE_ATLAS.assets[assetId]);
    expect(resolved.stack.layout.logicalTilePx).toBe(BOARD_TILE_LOGICAL_PX);
  });

  it("resolveBoardSprite returns atlas image ref", () => {
    const resolved = resolveBoardSprite("wke-terrain", "wke_sand_plain");
    expect(resolved.atlas.imageSrc).toBe(WKE_TERRAIN_SPRITE_ATLAS.imageSrc);
    expect(resolved.atlas.width).toBe(WKE_TERRAIN_SPRITE_ATLAS.width);
  });

  it("keeps walk and lip inside resolved crop bounds", () => {
    for (const assetId of listWkeTerrainTileIds()) {
      const { bounds, stack } = resolveTerrainTile(assetId);
      const bottom = walkBottom(stack.walk);
      expect(stack.walk.insetX + stack.walk.width).toBeLessThanOrEqual(bounds.sw);
      expect(bottom).toBeLessThanOrEqual(bounds.sh);
      expect(stack.lipStartY).toBeGreaterThanOrEqual(bottom);
      expect(stack.lipStartY).toBeLessThanOrEqual(bounds.sh);
    }

    for (const assetId of listWkePathTileIds()) {
      const { bounds, stack } = resolvePathTile(assetId);
      const bottom = walkBottom(stack.walk);
      expect(stack.walk.insetX + stack.walk.width).toBeLessThanOrEqual(bounds.sw);
      expect(bottom).toBeLessThanOrEqual(bounds.sh);
      expect(stack.lipStartY).toBeGreaterThanOrEqual(bottom);
      expect(stack.lipStartY).toBeLessThanOrEqual(bounds.sh);
    }
  });

  it("resolveStackPreset clamps to overridden crop dimensions", () => {
    const canonical = resolveSpriteBounds("wke-terrain", "wke_grass_plain");
    const smallerCrop = { ...canonical, sw: canonical.sw - 4, sh: canonical.sh - 4 };
    const stack = resolveStackPreset("wke-terrain", "wke_grass_plain", smallerCrop);
    expect(stack.walk.insetX + stack.walk.width).toBeLessThanOrEqual(smallerCrop.sw);
    expect(walkBottom(stack.walk)).toBeLessThanOrEqual(smallerCrop.sh);
  });

  it("resolves theme filler tiles for every map theme", () => {
    for (const theme of THEMES) {
      const filler = fillerTileForTheme(theme);
      expect(() => resolveTerrainTile(filler)).not.toThrow();
    }
  });

  it("assertBoardTilemapResolvable succeeds for all default maps", () => {
    for (const map of listDefaultMaps()) {
      const tilemap = buildBoardTilemap(map);
      expect(() => assertBoardTilemapResolvable(tilemap)).not.toThrow();
    }
  });
});
