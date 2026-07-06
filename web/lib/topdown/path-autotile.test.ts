import { describe, expect, it } from "vitest";
import {
  PATH_AUTOTILE_BY_SHAPE,
  pathAutotileForMask,
  pathCellShape,
  type PathCellShape,
} from "@/lib/topdown/path-autotile";
import { WKE_PATH_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

describe("path-autotile", () => {
  const shapes = Object.keys(PATH_AUTOTILE_BY_SHAPE) as PathCellShape[];

  it("maps every shape to a valid atlas asset", () => {
    for (const shape of shapes) {
      const assetId = PATH_AUTOTILE_BY_SHAPE[shape];
      expect(WKE_PATH_SPRITE_ATLAS.assets[assetId]).toBeDefined();
    }
  });

  it("resolves horizontal and vertical straights", () => {
    expect(pathAutotileForMask({ n: false, e: true, s: false, w: true })).toBe("path_r0c1");
    expect(pathAutotileForMask({ n: true, e: false, s: true, w: false })).toBe("path_r1c0");
  });

  it("resolves corners and cross", () => {
    expect(pathCellShape({ n: false, e: true, s: true, w: false })).toBe("corner-se");
    expect(pathAutotileForMask({ n: true, e: true, s: true, w: true })).toBe("path_r1c1");
  });
});
