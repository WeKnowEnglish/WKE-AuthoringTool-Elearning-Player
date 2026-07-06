import { describe, expect, it } from "vitest";
import { snapBoundsFromClickForAtlas } from "@/lib/topdown/atlas-bounds-snap";
import { WKE_PATH_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

describe("atlas-bounds-snap", () => {
  it("snaps path click to nearest grid cell without pixel detect", () => {
    expect(
      snapBoundsFromClickForAtlas(
        "wke-path",
        { x: 162, y: 162 },
        WKE_PATH_SPRITE_ATLAS.width,
        WKE_PATH_SPRITE_ATLAS.height,
      ),
    ).toEqual(WKE_PATH_SPRITE_ATLAS.assets.path_r0c0);
  });
});
