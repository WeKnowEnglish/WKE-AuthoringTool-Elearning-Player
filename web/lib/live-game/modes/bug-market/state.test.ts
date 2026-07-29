import { toPlainLson } from "@liveblocks/client";
import { describe, expect, it } from "vitest";
import { createBugMarketInitialModeStorage } from "@/lib/live-game/modes/bug-market/state";
import { getMapForMode } from "@/lib/live-game/modes";
import { BUG_MARKET_ASSETS, BUG_MARKET_SPECIES } from "@/lib/live-game/modes/bug-market/assets";
import { BUG_MARKET_MAP_V1_DOCUMENT } from "@/lib/live-game/modes/bug-market/map-v1";

describe("Bug Market round state", () => {
  it("creates typed, empty mode storage", () => {
    const storage = createBugMarketInitialModeStorage("class-5-seed");

    expect(toPlainLson(storage.modeState)).toMatchObject({
      data: {
        modeId: "bug_market",
        schemaVersion: 1,
        roundNumber: 0,
        meadowSeed: "class-5-seed",
      },
    });
    expect(storage.bugMarketPlayers.size).toBe(0);
    expect(storage.bugs.size).toBe(3);
    expect(storage.bugMarketCatchReceipts.size).toBe(0);
    expect(storage.bugMarketSaleReceipts.size).toBe(0);
    expect(storage.bugMarketPurchaseReceipts.size).toBe(0);
  });

  it("provides a bounded meadow with deterministic spawn points", () => {
    const map = getMapForMode("bug-market-v1", "bug_market");

    expect(map.widthPx).toBe(1280);
    expect(map.heightPx).toBe(720);
    expect(map.spawnPoints).toHaveLength(4);
    expect(map.collisionRects).toHaveLength(7);
    expect(BUG_MARKET_MAP_V1_DOCUMENT.title).toBe("Sunny Meadow");
  });

  it("registers the six-species MVP art pack", () => {
    expect(BUG_MARKET_SPECIES).toHaveLength(6);
    expect(new Set(BUG_MARKET_SPECIES.map((species) => species.id)).size).toBe(6);
    expect(BUG_MARKET_SPECIES.some((species) => species.rarity === "rare")).toBe(true);
    expect(BUG_MARKET_ASSETS.counterEmpty).toContain("counter-empty.webp");
    expect(BUG_MARKET_ASSETS.nets).toContain("nets.webp");
  });
});
