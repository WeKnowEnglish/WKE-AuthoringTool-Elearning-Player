import { describe, expect, it } from "vitest";
import sunnyMeadowJson from "@/lib/live-game/modes/bug-market/maps/sunny-meadow.json";
import {
  bugMarketMapDocumentSchema,
  getBugMarketMapRegion,
  parseBugMarketMapDocument,
  toLiveGameMapDef,
} from "@/lib/live-game/modes/bug-market/map-schema";

describe("Bug Market map documents", () => {
  it("loads the current meadow from serializable JSON", () => {
    const document = parseBugMarketMapDocument(JSON.parse(JSON.stringify(sunnyMeadowJson)));
    const runtimeMap = toLiveGameMapDef(document);

    expect(document.title).toBe("Sunny Meadow");
    expect(document.terrain.tileSizePx).toBe(420);
    expect(document.exits).toEqual([]);
    expect(runtimeMap).toMatchObject({ id: "bug-market-v1", widthPx: 1280, heightPx: 720 });
    expect(runtimeMap.collisionRects).toHaveLength(6);
    expect(runtimeMap.spawnPoints).toHaveLength(4);
  });

  it("keeps display and interaction bounds separate", () => {
    const document = parseBugMarketMapDocument(sunnyMeadowJson);
    const shop = getBugMarketMapRegion(document, "upgrade_shop");

    expect(shop.x).toBe(850);
    expect(shop.displayBounds.x).toBe(973);
  });

  it("rejects editor output that extends beyond the map", () => {
    const invalid = structuredClone(sunnyMeadowJson);
    invalid.collisionRects[0]!.w = 2000;

    expect(bugMarketMapDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects duplicate element ids", () => {
    const invalid = structuredClone(sunnyMeadowJson);
    invalid.spawnPoints[0]!.id = invalid.collisionRects[0]!.id;

    expect(bugMarketMapDocumentSchema.safeParse(invalid).success).toBe(false);
  });
});
