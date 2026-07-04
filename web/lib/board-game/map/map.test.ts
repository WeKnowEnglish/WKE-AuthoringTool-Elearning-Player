import { describe, expect, it } from "vitest";
import { getDefaultMapForPathStyle, getMapById, listDefaultMaps } from "@/lib/board-game/map/default-maps";
import { generateBoardMap, gridBoundsForMap, pathIndexFromSpaceId } from "@/lib/board-game/map/generate-map";
import { boardLengthFromMap, mapToRuntimeSpaces } from "@/lib/board-game/map/map-to-runtime";
import { boardLengthForSetup, resolveMapForSetup } from "@/lib/board-game/map/resolve-map";
import { parseBoardMap, validateBoardMap } from "@/lib/board-game/map/schema";
import type { GameSetup } from "@/lib/board-game/types";

const baseSetup: GameSetup = {
  schemaVersion: 1,
  playerCount: 2,
  players: [
    { id: "p1", name: "Alice", color: "#ef4444" },
    { id: "p2", name: "Bob", color: "#3b82f6" },
  ],
  boardPathStyle: "short",
  questions: [],
};

describe("board map schema", () => {
  it("validates built-in default maps", () => {
    for (const map of listDefaultMaps()) {
      expect(validateBoardMap(map)).not.toBeNull();
      expect(() => parseBoardMap(map)).not.toThrow();
    }
  });

  it("rejects duplicate pathOrder entries", () => {
    const map = structuredClone(getDefaultMapForPathStyle("short"));
    map.pathOrder[1] = map.pathOrder[0]!;
    expect(validateBoardMap(map)).toBeNull();
  });

  it("rejects unknown space ids in pathOrder", () => {
    const map = structuredClone(getDefaultMapForPathStyle("short"));
    map.pathOrder.push(9999);
    expect(validateBoardMap(map)).toBeNull();
  });
});

describe("board map generators", () => {
  it("generates snake, spiral, and island layouts", () => {
    for (const layoutTemplate of ["snake", "spiral", "island"] as const) {
      const map = generateBoardMap({
        id: `test-${layoutTemplate}`,
        title: "Test",
        layoutTemplate,
        boardLength: 20,
      });
      expect(map.pathOrder).toHaveLength(21);
      expect(map.spaces).toHaveLength(21);
      expect(boardLengthFromMap(map)).toBe(20);
      expect(gridBoundsForMap(map).cols).toBeGreaterThan(0);
    }
  });

  it("maps path indices to space ids in order", () => {
    const map = getDefaultMapForPathStyle("medium");
    map.pathOrder.forEach((spaceId, pathIndex) => {
      expect(pathIndexFromSpaceId(map, spaceId)).toBe(pathIndex);
    });
  });

  it("produces runtime lucky spaces from map specials", () => {
    const map = getDefaultMapForPathStyle("short");
    const runtimeSpaces = mapToRuntimeSpaces(map);
    expect(runtimeSpaces.length).toBeGreaterThan(0);
    for (const space of runtimeSpaces) {
      expect(space.index).toBeGreaterThan(0);
      expect(space.index).toBeLessThan(boardLengthFromMap(map));
    }
  });
});

describe("resolveMapForSetup", () => {
  it("falls back to boardPathStyle default maps", () => {
    const map = resolveMapForSetup({ ...baseSetup, boardPathStyle: "long" });
    expect(map.id).toBe("default-long");
    expect(boardLengthForSetup({ ...baseSetup, boardPathStyle: "long" })).toBe(30);
  });

  it("uses embedded map when provided", () => {
    const custom = generateBoardMap({
      id: "custom",
      title: "Custom",
      layoutTemplate: "snake",
      boardLength: 15,
    });
    const map = resolveMapForSetup({ ...baseSetup, map: custom });
    expect(map.id).toBe("custom");
    expect(boardLengthForSetup({ ...baseSetup, map: custom })).toBe(15);
  });

  it("ships at least three layout templates in defaults", () => {
    const templates = new Set(listDefaultMaps().map((map) => map.layoutTemplate));
    expect(templates.has("snake")).toBe(true);
    expect(templates.has("spiral")).toBe(true);
    expect(templates.has("island")).toBe(true);
  });

  it("includes extended 40/60/80 presets", () => {
    expect(getMapById("default-epic")).not.toBeNull();
    expect(getMapById("default-marathon")).not.toBeNull();
    expect(getMapById("default-legend")).not.toBeNull();
  });

  it("registers path-style defaults", () => {
    expect(getMapById("default-short")).toBeDefined();
    expect(getMapById("default-medium")).toBeDefined();
    expect(getMapById("default-long")).toBeDefined();
  });
});
