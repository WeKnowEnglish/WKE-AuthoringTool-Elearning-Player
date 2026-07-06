import { describe, expect, it } from "vitest";
import { generateBoardMap, gridBoundsForMap } from "@/lib/board-game/map/generate-map";
import { listDefaultMaps } from "@/lib/board-game/map/default-maps";
import { buildBoardTilemap, boardLengthFromMap } from "@/lib/board-game/render/build-board-tilemap";
import { fillerTileForTheme, spriteForBoardPathTile } from "@/lib/board-game/render/terrain-tiles";
import { WKE_PATH_SPRITE_ATLAS } from "@/lib/topdown/wke-sprite-atlas";

describe("build-board-tilemap", () => {
  const snakeMap = generateBoardMap({
    id: "test-snake",
    title: "Test",
    theme: "jungle",
    layoutTemplate: "snake",
    boardLength: 12,
    random: () => 0.5,
  });

  it("matches gridBoundsForMap dimensions", () => {
    const tilemap = buildBoardTilemap(snakeMap);
    const bounds = gridBoundsForMap(snakeMap);
    expect(tilemap.cols).toBe(bounds.cols);
    expect(tilemap.rows).toBe(bounds.rows);
    expect(tilemap.terrain.length).toBe(bounds.rows);
    expect(tilemap.terrain[0]?.length).toBe(bounds.cols);
  });

  it("fills off-path cells with theme filler", () => {
    const tilemap = buildBoardTilemap(snakeMap);
    const filler = fillerTileForTheme("jungle");
    const boardLength = boardLengthFromMap(snakeMap);

    for (let row = 0; row < tilemap.rows; row++) {
      for (let col = 0; col < tilemap.cols; col++) {
        const pathIndex = tilemap.pathIndexAt[row]?.[col];
        if (pathIndex === undefined) {
          expect(tilemap.terrain[row]?.[col]).toBe(filler);
        } else if (pathIndex > 0 && pathIndex < boardLength) {
          const space = snakeMap.spaces.find((s) => snakeMap.pathOrder[pathIndex] === s.id);
          if (!space?.kind || space.kind === "normal") {
            expect(tilemap.terrain[row]?.[col]).toBe(filler);
          }
        }
      }
    }
  });

  it("uses start and finish terrain on path endpoints", () => {
    const tilemap = buildBoardTilemap(snakeMap);
    const boardLength = boardLengthFromMap(snakeMap);
    let sawStart = false;
    let sawFinish = false;

    for (let row = 0; row < tilemap.rows; row++) {
      for (let col = 0; col < tilemap.cols; col++) {
        const pathIndex = tilemap.pathIndexAt[row]?.[col];
        if (pathIndex === 0) {
          sawStart = true;
          expect(tilemap.terrain[row]?.[col]).toBe(
            spriteForBoardPathTile("jungle", 0, boardLength),
          );
        }
        if (pathIndex === boardLength) {
          sawFinish = true;
          expect(tilemap.terrain[row]?.[col]).toBe(
            spriteForBoardPathTile("jungle", boardLength, boardLength),
          );
        }
      }
    }

    expect(sawStart).toBe(true);
    expect(sawFinish).toBe(true);
  });

  it("assigns path autotiles on every path cell", () => {
    const tilemap = buildBoardTilemap(snakeMap);
    const pathCount = tilemap.path.flat().filter(Boolean).length;
    expect(pathCount).toBe(snakeMap.pathOrder.length);

    for (const assetId of tilemap.path.flat()) {
      if (!assetId) continue;
      expect(WKE_PATH_SPRITE_ATLAS.assets[assetId]).toBeDefined();
    }
  });

  it("records pathIndexAt on path cells only", () => {
    const tilemap = buildBoardTilemap(snakeMap);
    let indexed = 0;
    for (let row = 0; row < tilemap.rows; row++) {
      for (let col = 0; col < tilemap.cols; col++) {
        const pathIndex = tilemap.pathIndexAt[row]?.[col];
        if (pathIndex !== undefined) {
          indexed++;
          expect(tilemap.path[row]?.[col]).not.toBeNull();
          expect(pathIndex).toBeGreaterThanOrEqual(0);
          expect(pathIndex).toBeLessThanOrEqual(boardLengthFromMap(snakeMap));
        }
      }
    }
    expect(indexed).toBe(snakeMap.pathOrder.length);
  });

  it("uses alternating terrain on interior path cells when full-legacy decoration is set", () => {
    const legacyMap = { ...snakeMap, pathTerrainDecoration: "full-legacy" as const };
    const tilemap = buildBoardTilemap(legacyMap);
    const boardLength = boardLengthFromMap(legacyMap);
    let sawInteriorLegacy = false;

    for (let row = 0; row < tilemap.rows; row++) {
      for (let col = 0; col < tilemap.cols; col++) {
        const pathIndex = tilemap.pathIndexAt[row]?.[col];
        if (pathIndex === undefined || pathIndex === 0 || pathIndex === boardLength) continue;

        const space = snakeMap.spaces.find((s) => snakeMap.pathOrder[pathIndex] === s.id);
        if (space?.kind && space.kind !== "normal") continue;

        expect(tilemap.terrain[row]?.[col]).toBe(
          spriteForBoardPathTile("jungle", pathIndex, boardLength),
        );
        sawInteriorLegacy = true;
      }
    }

    expect(sawInteriorLegacy).toBe(true);
  });

  it("builds every default map without error", () => {
    for (const map of listDefaultMaps()) {
      const tilemap = buildBoardTilemap(map);
      const pathCells = tilemap.path.flat().filter(Boolean).length;
      expect(pathCells).toBeGreaterThan(0);
      expect(pathCells).toBeLessThanOrEqual(map.pathOrder.length);
    }
  });
});
