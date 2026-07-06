import { describe, expect, it } from "vitest";
import { snapBoundsToWkePathGrid } from "@/lib/topdown/wke-path-grid";
import { WKE_PATH_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

describe("wke-path-grid", () => {
  it("snaps click in second column to path_r0c1", () => {
    expect(
      snapBoundsToWkePathGrid(
        { sx: 0, sy: 0, sw: 280, sh: 280 },
        WKE_PATH_SPRITE_ATLAS.width,
        WKE_PATH_SPRITE_ATLAS.height,
        { x: 480, y: 160 },
      ),
    ).toEqual(WKE_PATH_SPRITE_ATLAS.assets.path_r0c1);
  });

  it("snaps first path cell at origin", () => {
    expect(
      snapBoundsToWkePathGrid(
        { sx: 0, sy: 0, sw: 300, sh: 300 },
        WKE_PATH_SPRITE_ATLAS.width,
        WKE_PATH_SPRITE_ATLAS.height,
        { x: 160, y: 160 },
      ),
    ).toEqual(WKE_PATH_SPRITE_ATLAS.assets.path_r0c0);
  });

  it("snaps bottom-right cell to path_r3c3", () => {
    expect(
      snapBoundsToWkePathGrid(
        { sx: 900, sy: 900, sw: 300, sh: 300 },
        WKE_PATH_SPRITE_ATLAS.width,
        WKE_PATH_SPRITE_ATLAS.height,
        { x: 1090, y: 1090 },
      ),
    ).toEqual(WKE_PATH_SPRITE_ATLAS.assets.path_r3c3);
  });
});
