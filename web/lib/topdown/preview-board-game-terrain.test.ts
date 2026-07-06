import { describe, expect, it } from "vitest";
import {
  buildBoardGamePreviewPathTiles,
  buildBoardGamePreviewTiles,
  buildBoardGamePreviewTilesLegacy,
  spriteForBoardPathTile,
} from "@/lib/topdown/preview-board-game-terrain";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import { generateBoardMap } from "@/lib/board-game/map/generate-map";
describe("preview-board-game-terrain", () => {
  it("maps jungle theme path tiles to grass family", () => {
    expect(spriteForBoardPathTile("jungle", 0, 12)).toBe("wke_grass_corner");
    expect(spriteForBoardPathTile("jungle", 1, 12)).toBe("wke_grass_flowers");
    expect(spriteForBoardPathTile("jungle", 2, 12)).toBe("wke_grass_plain");
    expect(spriteForBoardPathTile("jungle", 12, 12)).toBe("wke_grass_flowers_2");
  });

  it("maps ocean theme to water family", () => {
    expect(spriteForBoardPathTile("ocean", 2, 12)).toBe("wke_water_1");
    expect(spriteForBoardPathTile("ocean", 3, 12)).toBe("wke_water_2");
  });

  it("buildBoardGamePreviewTiles matches legacy terrain grid", () => {
    const options = { theme: "jungle" as const, boardLength: 12, layout: "snake" as const };
    expect(buildBoardGamePreviewTiles(options)).toEqual(buildBoardGamePreviewTilesLegacy(options));
  });

  it("buildBoardGamePreviewPathTiles returns autotiles on path cells", () => {
    const pathTiles = buildBoardGamePreviewPathTiles({
      theme: "jungle",
      boardLength: 12,
      layout: "snake",
    });
    const nonNull = pathTiles.flat().filter(Boolean);
    expect(nonNull.length).toBe(13);
    expect(nonNull.every((id) => id?.startsWith("path_r"))).toBe(true);
  });

  it("buildBoardTilemap uses start/finish terrain on endpoints", () => {
    const map = generateBoardMap({
      id: "preview",
      title: "Preview",
      theme: "jungle",
      layoutTemplate: "snake",
      boardLength: 12,
      random: () => 0.5,
    });
    const tilemap = buildBoardTilemap(map);
    const boardLength = 12;
    const legacy = buildBoardGamePreviewTilesLegacy({
      theme: "jungle",
      boardLength: 12,
      layout: "snake",
    });

    for (let row = 0; row < tilemap.rows; row++) {
      for (let col = 0; col < tilemap.cols; col++) {
        const pathIndex = tilemap.pathIndexAt[row]?.[col];
        if (pathIndex === 0 || pathIndex === boardLength) {
          expect(tilemap.terrain[row]?.[col]).toBe(legacy[row]?.[col]);
        }
      }
    }
  });

  it("buildBoardTilemap interior terrain still differs from full legacy grid", () => {
    const map = generateBoardMap({
      id: "preview",
      title: "Preview",
      theme: "jungle",
      layoutTemplate: "snake",
      boardLength: 12,
      random: () => 0.5,
    });
    const tilemap = buildBoardTilemap(map);
    const legacy = buildBoardGamePreviewTilesLegacy({
      theme: "jungle",
      boardLength: 12,
      layout: "snake",
    });
    expect(tilemap.terrain).not.toEqual(legacy);
  });
});