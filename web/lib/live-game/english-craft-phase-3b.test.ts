import { describe, expect, it } from "vitest";
import { resetEnglishCraftGameplayState } from "@/lib/live-game/liveblocks/gameplay-reset";
import { createLiveGameInitialStorage } from "@/lib/live-game/liveblocks/initial-storage";
import { DEFAULT_LIVE_GAME_PRESENCE } from "@/lib/live-game/liveblocks/config";
import { readPlayerCarry } from "@/lib/live-game/server/player-carry";
import { readResourcePool } from "@/lib/live-game/resource-pool";

describe("english-craft phase 3b storage", () => {
  it("initializes a four-resource pool and empty playerCarry map", () => {
    const storage = createLiveGameInitialStorage({
      hostUserId: "host-1",
      joinCode: "ABCD12",
      modeId: "english_craft",
      mapId: "english-craft-v1",
      durationMinutes: 20,
      questionSetId: "grade56-adjectives",
      questionSetVersion: 1,
    });

    expect(storage.resourcePool.get("wood")).toBe(0);
    expect(storage.resourcePool.get("stone")).toBe(0);
    expect(storage.resourcePool.get("wheat")).toBe(0);
    expect(storage.resourcePool.get("cotton")).toBe(0);
    expect(storage.playerCarry).toBeDefined();
  });

  it("zero-fills legacy wood-only pool snapshots", () => {
    expect(
      readResourcePool({
        session: {} as never,
        players: {},
        resourcePool: { wood: 4 },
      }),
    ).toEqual({ wood: 4, stone: 0, wheat: 0, cotton: 0 });
  });

  it("clears carry on gameplay reset", () => {
    const storage = {
      get(key: string) {
        if (key === "resourcePool") {
          return {
            set: (field: string, value: number) => {
              pool[field] = value;
            },
          };
        }
        if (key === "craftedItems") {
          return { set: () => undefined };
        }
        if (key === "unlockedObjects") {
          return { set: () => undefined };
        }
        if (key === "playerCarry") {
          return playerCarry;
        }
        return undefined;
      },
      set: () => undefined,
    };

    const pool: Record<string, number> = { wood: 3, stone: 1, wheat: 0, cotton: 0 };
    const playerCarry = {
      keys: () => ["player-1"],
      delete: (id: string) => {
        deleted.push(id);
      },
    };
    const deleted: string[] = [];

    resetEnglishCraftGameplayState(storage as never);

    expect(pool).toEqual({ wood: 0, stone: 0, wheat: 0, cotton: 0 });
    expect(deleted).toEqual(["player-1"]);
  });

  it("defaults presence carry to null", () => {
    expect(DEFAULT_LIVE_GAME_PRESENCE.carriedResourceType).toBeNull();
  });

  it("reads missing carry as null", () => {
    expect(readPlayerCarry({ session: {} as never, players: {} }, "player-1")).toBeNull();
  });
});
