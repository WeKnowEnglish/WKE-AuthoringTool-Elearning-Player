import { describe, expect, it } from "vitest";
import {
  buildBlockedMapCells,
  listAvailableMapCells,
  pickSpreadCells,
} from "@/lib/live-game/modes/english-craft/map-placement-v1";
import {
  ENGLISH_CRAFT_RESOURCE_NODES_V1,
  ENGLISH_CRAFT_STRUCTURES_V1,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { ENGLISH_CRAFT_RIVER_COLLISION_RECTS } from "@/lib/live-game/modes/english-craft/map-v1";

function pointInRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function cellKey(col: number, row: number) {
  return `${col},${row}`;
}

describe("english-craft map objects v1", () => {
  it("defines twenty resource nodes across four types", () => {
    expect(ENGLISH_CRAFT_RESOURCE_NODES_V1).toHaveLength(20);
    expect(new Set(ENGLISH_CRAFT_RESOURCE_NODES_V1.map((node) => node.id)).size).toBe(20);
    expect(new Set(ENGLISH_CRAFT_RESOURCE_NODES_V1.map((node) => cellKey(node.col, node.row))).size).toBe(
      20,
    );
  });

  it("places storages on the south shore away from the river band", () => {
    const storageKinds = ENGLISH_CRAFT_STRUCTURES_V1.filter((structure) =>
      structure.kind.endsWith("_storage"),
    );
    expect(storageKinds).toHaveLength(4);
    for (const storage of storageKinds) {
      expect(storage.row).toBeGreaterThanOrEqual(10);
    }
  });

  it("keeps harvest nodes off river, structures, and spawn tiles", () => {
    const structureCells = ENGLISH_CRAFT_STRUCTURES_V1.map((structure) => ({
      col: structure.col,
      row: structure.row,
    }));
    structureCells.push({ col: 11, row: 5 });
    const blocked = buildBlockedMapCells(structureCells);
    for (const node of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
      expect(blocked.has(cellKey(node.col, node.row))).toBe(false);
    }
  });

  it("keeps harvest nodes out of river collision rects when the bridge is locked", () => {
    for (const node of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
      const insideRiver = ENGLISH_CRAFT_RIVER_COLLISION_RECTS.some((rect) =>
        pointInRect(node.x, node.y, rect),
      );
      expect(insideRiver).toBe(false);
    }
  });

  it("keeps the workbench near a storage building", () => {
    const bench = ENGLISH_CRAFT_STRUCTURES_V1.find((structure) => structure.kind === "workbench")!;
    const nearestStorage = ENGLISH_CRAFT_STRUCTURES_V1.filter((structure) =>
      structure.kind.endsWith("_storage"),
    ).some((storage) => {
      const dx = bench.x - storage.x;
      const dy = bench.y - storage.y;
      return Math.hypot(dx, dy) <= 400;
    });
    expect(nearestStorage).toBe(true);
  });
});

describe("english-craft map placement", () => {
  it("has enough open tiles for twenty spread resource nodes", () => {
    const blocked = buildBlockedMapCells([{ col: 10, row: 3 }]);
    const available = listAvailableMapCells(blocked);
    expect(available.length).toBeGreaterThanOrEqual(20);
    expect(pickSpreadCells(available, 20)).toHaveLength(20);
  });
});
