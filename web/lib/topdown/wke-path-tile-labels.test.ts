import { describe, expect, it } from "vitest";
import { PATH_AUTOTILE_BY_SHAPE } from "@/lib/topdown/path-autotile";
import { listWkePathTileIds } from "@/lib/topdown/wke-path-tile-presets";
import {
  pathTileLabel,
  pathTileLiveShapes,
  WKE_PATH_TILE_LABELS,
} from "@/lib/topdown/wke-path-tile-labels";

describe("wke-path-tile-labels", () => {
  it("labels every path atlas asset", () => {
    for (const assetId of listWkePathTileIds()) {
      const label = pathTileLabel(assetId);
      expect(label.title.length).toBeGreaterThan(0);
      expect(label.subtitle.length).toBeGreaterThan(0);
      expect(WKE_PATH_TILE_LABELS[assetId]).toBe(label);
    }
  });

  it("marks live autotile picks from PATH_AUTOTILE_BY_SHAPE", () => {
    for (const [shape, assetId] of Object.entries(PATH_AUTOTILE_BY_SHAPE)) {
      expect(pathTileLiveShapes(assetId)).toContain(shape);
      expect(pathTileLabel(assetId).liveAutotile).toBe(true);
    }
  });

  it("identifies non-live sheet variants", () => {
    expect(pathTileLabel("path_r2c1").liveAutotile).toBe(false);
    expect(pathTileLabel("path_r2c1").title).toContain("alt");
  });
});
