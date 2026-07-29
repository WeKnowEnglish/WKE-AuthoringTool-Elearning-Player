import { describe, expect, it } from "vitest";
import sunnyMeadowJson from "@/lib/live-game/modes/bug-market/maps/sunny-meadow.json";
import cliffsideMeadowJson from "@/lib/live-game/modes/bug-market/maps/cliffside-meadow.json";
import {
  bugMarketMapDocumentSchema,
  getBugMarketMapRegion,
  parseBugMarketMapDocument,
  parseBugMarketMapCatalog,
  toLiveGameMapDef,
} from "@/lib/live-game/modes/bug-market/map-schema";

describe("Bug Market map documents", () => {
  it("loads the current meadow from serializable JSON", () => {
    const document = parseBugMarketMapDocument(JSON.parse(JSON.stringify(sunnyMeadowJson)));
    const runtimeMap = toLiveGameMapDef(document);

    expect(document.title).toBe("Sunny Meadow");
    expect(document.terrain.tileSizePx).toBe(420);
    expect(document.exits).toHaveLength(1);
    expect(runtimeMap).toMatchObject({ id: "bug-market-v1", widthPx: 1280, heightPx: 720 });
    expect(runtimeMap.collisionRects).toHaveLength(7);
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

  it("validates reciprocal meadow destinations and spawn targets", () => {
    const catalog = parseBugMarketMapCatalog([sunnyMeadowJson, cliffsideMeadowJson]);

    expect(catalog.map((map) => map.id)).toEqual(["bug-market-v1", "bug-market-cliffside"]);
    expect(catalog.flatMap((map) => map.exits)).toHaveLength(2);
  });

  it("rejects an exit whose destination spawn does not exist", () => {
    const invalidSunny = structuredClone(sunnyMeadowJson);
    invalidSunny.exits[0]!.destinationSpawnId = "missing-spawn";

    expect(() => parseBugMarketMapCatalog([invalidSunny, cliffsideMeadowJson])).toThrow(/missing spawn/);
  });
});
