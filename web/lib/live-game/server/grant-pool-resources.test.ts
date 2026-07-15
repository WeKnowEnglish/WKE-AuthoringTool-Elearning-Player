import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  grantPoolResources,
  isLiveGameResourceType,
  LIVE_GAME_HOST_GRANT_POOL_AMOUNT,
} from "@/lib/live-game/server/grant-pool-resources";

const mutateStorage = vi.fn();

vi.mock("@/lib/live-game/server/liveblocks-client", () => ({
  getLiveblocksServerClient: () => ({ mutateStorage }),
}));

function makePool(values: Record<string, number>) {
  const store = { ...values };
  return {
    get(key: string) {
      return store[key];
    },
    set(key: string, value: unknown) {
      store[key] = value as number;
    },
    _store: store,
  };
}

function makeRoot(phase: string, pool: ReturnType<typeof makePool> | null) {
  const session = {
    get(key: string) {
      if (key === "phase") return phase;
      return null;
    },
    set() {},
  };
  return {
    get(key: string) {
      if (key === "session") return session;
      if (key === "resourcePool") return pool;
      return undefined;
    },
    set() {},
  };
}

describe("grantPoolResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes valid resource types", () => {
    expect(isLiveGameResourceType("wood")).toBe(true);
    expect(isLiveGameResourceType("stone")).toBe(true);
    expect(isLiveGameResourceType("gold")).toBe(false);
  });

  it("adds the default host grant amount while playing", async () => {
    const pool = makePool({ wood: 3, stone: 0, wheat: 0, cotton: 0 });
    mutateStorage.mockImplementation(async (_roomId: string, fn: (args: { root: unknown }) => void) => {
      fn({ root: makeRoot("playing", pool) });
    });

    const result = await grantPoolResources({ roomId: "room-1", resourceType: "wood" });
    expect(result).toEqual({
      resourceType: "wood",
      amount: LIVE_GAME_HOST_GRANT_POOL_AMOUNT,
      poolCount: 3 + LIVE_GAME_HOST_GRANT_POOL_AMOUNT,
    });
    expect(pool._store.wood).toBe(8);
  });

  it("does nothing when the session is not playing", async () => {
    const pool = makePool({ wood: 1, stone: 0, wheat: 0, cotton: 0 });
    mutateStorage.mockImplementation(async (_roomId: string, fn: (args: { root: unknown }) => void) => {
      fn({ root: makeRoot("lobby", pool) });
    });

    const result = await grantPoolResources({ roomId: "room-1", resourceType: "wood" });
    expect(result).toBeNull();
    expect(pool._store.wood).toBe(1);
  });
});
