import { describe, expect, it } from "vitest";
import { snapBoundsToWkeTerrainGrid } from "@/lib/topdown/wke-terrain-grid";
import { WKE_TERRAIN_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

describe("wke-terrain-grid", () => {
  it("snaps click in second column to grass flowers cell", () => {
    expect(
      snapBoundsToWkeTerrainGrid(
        { sx: 18, sy: 19, sw: 95, sh: 104 },
        WKE_TERRAIN_SPRITE_ATLAS.width,
        WKE_TERRAIN_SPRITE_ATLAS.height,
        { x: 175, y: 64 },
      ),
    ).toEqual(WKE_TERRAIN_SPRITE_ATLAS.assets.wke_grass_flowers);
  });

  it("snaps first grass plain cell at origin column", () => {
    expect(
      snapBoundsToWkeTerrainGrid(
        { sx: 0, sy: 0, sw: 100, sh: 100 },
        WKE_TERRAIN_SPRITE_ATLAS.width,
        WKE_TERRAIN_SPRITE_ATLAS.height,
        { x: 64, y: 64 },
      ),
    ).toEqual(WKE_TERRAIN_SPRITE_ATLAS.assets.wke_grass_plain);
  });

  it("snaps sand row click to wke_sand_plain", () => {
    expect(
      snapBoundsToWkeTerrainGrid(
        { sx: 20, sy: 212, sw: 88, sh: 88 },
        WKE_TERRAIN_SPRITE_ATLAS.width,
        WKE_TERRAIN_SPRITE_ATLAS.height,
        { x: 64, y: 296 },
      ),
    ).toEqual(WKE_TERRAIN_SPRITE_ATLAS.assets.wke_sand_plain);
  });
});
