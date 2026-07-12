import { describe, expect, it } from "vitest";
import { createLiveGameInitialStorage } from "@/lib/live-game/liveblocks/initial-storage";
import { resetEnglishCraftGameplayState } from "@/lib/live-game/liveblocks/gameplay-reset";
import { ENGLISH_CRAFT_ART } from "@/lib/live-game/modes/english-craft/english-craft-art";
import {
  ENGLISH_CRAFT_DOCK_V1,
  ENGLISH_CRAFT_RESOURCE_NODES_V1,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { buildBlockedMapCells } from "@/lib/live-game/modes/english-craft/map-placement-v1";
import {
  ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECT_COUNT,
  ENGLISH_CRAFT_RIVER_COLLISION_RECT_COUNT,
  getEnglishCraftCollisionRects,
} from "@/lib/live-game/modes/english-craft/map-v1";
import {
  ENGLISH_CRAFT_TILEMAP_V1,
  isPerimeterWaterCell,
} from "@/lib/live-game/modes/english-craft/tilemap-v1";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS, readCraftedItems } from "@/lib/live-game/server/read-crafted-items";

function cellKey(col: number, row: number) {
  return `${col},${row}`;
}

describe("english-craft phase 4a perimeter water", () => {
  it("marks north edge and side columns as water cells", () => {
    expect(ENGLISH_CRAFT_TILEMAP_V1.cells[0]?.[0]).toBeNull();
    expect(ENGLISH_CRAFT_TILEMAP_V1.cells[0]?.[10]).toBeNull();
    expect(ENGLISH_CRAFT_TILEMAP_V1.cells[5]?.[0]).toBeNull();
    expect(ENGLISH_CRAFT_TILEMAP_V1.cells[10]?.[19]).toBeNull();
    expect(ENGLISH_CRAFT_TILEMAP_V1.cells[4]?.[5]).not.toBeNull();
  });

  it("includes perimeter water in collision rects", () => {
    const rects = getEnglishCraftCollisionRects(false);
    expect(ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECT_COUNT).toBeGreaterThan(0);
    expect(rects.length).toBeGreaterThanOrEqual(
      ENGLISH_CRAFT_PERIMETER_WATER_COLLISION_RECT_COUNT + ENGLISH_CRAFT_RIVER_COLLISION_RECT_COUNT,
    );
  });

  it("keeps harvest nodes off perimeter water cells", () => {
    const blocked = buildBlockedMapCells([]);
    for (const node of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
      expect(isPerimeterWaterCell(node.col, node.row)).toBe(false);
      expect(blocked.has(cellKey(node.col, node.row))).toBe(false);
    }
  });
});

describe("english-craft phase 4a schema", () => {
  it("initializes expanded crafted items and personal maps", () => {
    const storage = createLiveGameInitialStorage({
      hostUserId: "host-1",
      joinCode: "ABCD12",
      modeId: "english_craft",
      mapId: "english-craft-v1",
      durationMinutes: 20,
      questionSetId: "grade56-adjectives",
      questionSetVersion: 1,
    });

    expect(storage.craftedItems.get("benchBuilt")).toBe(false);
    expect(storage.craftedItems.get("hammers")).toBe(0);
    expect(storage.craftedItems.get("boat")).toBe(false);
    expect(storage.craftedItems.get("bridge")).toBe(false);
    expect(storage.playerInventory).toBeDefined();
    expect(storage.playerHunger).toBeDefined();
  });

  it("reads legacy bridge-only crafted snapshots safely", () => {
    expect(
      readCraftedItems({
        session: {} as never,
        players: {},
        craftedItems: { bridge: true },
      }),
    ).toEqual({
      benchBuilt: false,
      hammers: 0,
      boat: false,
      bridge: true,
    });
  });

  it("resets crafted items and clears personal maps", () => {
    const craftedValues: Record<string, unknown> = {
      benchBuilt: true,
      hammers: 3,
      boat: true,
      bridge: true,
    };
    const inventoryDeleted: string[] = [];
    const hungerDeleted: string[] = [];

    const storage = {
      get(key: string) {
        if (key === "resourcePool") {
          return { set: () => undefined };
        }
        if (key === "craftedItems") {
          return {
            set: (field: string, value: unknown) => {
              craftedValues[field] = value;
            },
          };
        }
        if (key === "unlockedObjects") {
          return { set: () => undefined };
        }
        if (key === "playerCarry") {
          return { keys: () => [], delete: () => undefined };
        }
        if (key === "playerInventory") {
          return {
            keys: () => ["player-1"],
            delete: (id: string) => {
              inventoryDeleted.push(id);
            },
          };
        }
        if (key === "playerHunger") {
          return {
            keys: () => ["player-1"],
            delete: (id: string) => {
              hungerDeleted.push(id);
            },
          };
        }
        return undefined;
      },
      set: () => undefined,
    };

    resetEnglishCraftGameplayState(storage as never);

    expect(craftedValues).toEqual({ ...DEFAULT_LIVE_GAME_CRAFTED_ITEMS });
    expect(inventoryDeleted).toEqual(["player-1"]);
    expect(hungerDeleted).toEqual(["player-1"]);
  });
});

describe("english-craft phase 4a art and dock", () => {
  it("registers hammer, boat, and backpack assets", () => {
    for (const src of [ENGLISH_CRAFT_ART.hammer, ENGLISH_CRAFT_ART.boat, ENGLISH_CRAFT_ART.backpack]) {
      expect(src.startsWith("/assets/Live%20Games%20Art%20Assets/")).toBe(true);
    }
  });

  it("places the dock between wheat and cotton storages", () => {
    expect(ENGLISH_CRAFT_DOCK_V1.col).toBe(16);
    expect(ENGLISH_CRAFT_DOCK_V1.row).toBe(10);
  });
});
