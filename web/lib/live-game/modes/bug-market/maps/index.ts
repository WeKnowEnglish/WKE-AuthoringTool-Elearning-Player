import cliffsideMeadowJson from "@/lib/live-game/modes/bug-market/maps/cliffside-meadow.json";
import sunnyMeadowJson from "@/lib/live-game/modes/bug-market/maps/sunny-meadow.json";
import { parseBugMarketMapCatalog } from "@/lib/live-game/modes/bug-market/map-schema";

export const BUG_MARKET_MAP_DOCUMENTS = parseBugMarketMapCatalog([
  sunnyMeadowJson,
  cliffsideMeadowJson,
]);

export const BUG_MARKET_MAP_DOCUMENTS_BY_ID = new Map(
  BUG_MARKET_MAP_DOCUMENTS.map((document) => [document.id, document]),
);
