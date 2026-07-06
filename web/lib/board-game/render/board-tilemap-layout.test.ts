import { describe, expect, it } from "vitest";
import { generateBoardMap } from "@/lib/board-game/map/generate-map";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import {
  boardTilemapCanvasSize,
  boardTilemapGridStyle,
  boardTilemapLayoutForTheme,
  boardTilemapLayoutFromTilemap,
} from "@/lib/board-game/render/board-tilemap-layout";

describe("board-tilemap-layout", () => {
  it("derives stride from theme filler preset", () => {
    const jungle = boardTilemapLayoutForTheme("jungle");
    const ocean = boardTilemapLayoutForTheme("ocean");
    expect(jungle.logicalTilePx).toBeGreaterThan(0);
    expect(jungle.colStride).toBeGreaterThan(0);
    expect(jungle.rowStride).toBeGreaterThan(0);
    expect(jungle.rowStride).toBeLessThanOrEqual(jungle.logicalTilePx);
    expect(jungle.referenceSprite.atlasId).toBe("wke-terrain");
    expect(ocean.referenceSprite.assetId).not.toBe(jungle.referenceSprite.assetId);
  });

  it("matches tilemap dimensions", () => {
    const map = generateBoardMap({
      id: "layout-test",
      title: "Layout",
      theme: "jungle",
      layoutTemplate: "snake",
      boardLength: 12,
      random: () => 0.5,
    });
    const tilemap = buildBoardTilemap(map);
    const layout = boardTilemapLayoutFromTilemap(tilemap, map.theme);
    expect(layout.cols).toBe(tilemap.cols);
    expect(layout.rows).toBe(tilemap.rows);
  });

  it("builds gapless grid styles", () => {
    const layout = boardTilemapLayoutForTheme("jungle");
    const style = boardTilemapGridStyle(4, layout);
    expect(style.display).toBe("grid");
    expect(style.gap).toBe(0);
    expect(String(style.gridTemplateColumns)).toContain(`${layout.colStride}px`);
  });

  it("computes canvas pixel size from grid bounds", () => {
    const layout = boardTilemapLayoutForTheme("jungle");
    const size = boardTilemapCanvasSize(4, 3, layout);
    expect(size.width).toBe(4 * layout.colStride);
    expect(size.height).toBe(3 * layout.rowStride);
  });
});
