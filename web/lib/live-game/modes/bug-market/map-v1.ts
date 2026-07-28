import sunnyMeadowJson from "@/lib/live-game/modes/bug-market/maps/sunny-meadow.json";
import {
  parseBugMarketMapDocument,
  toLiveGameMapDef,
} from "@/lib/live-game/modes/bug-market/map-schema";

/** Serializable source document that the future map editor will read and write. */
export const BUG_MARKET_MAP_V1_DOCUMENT = parseBugMarketMapDocument(sunnyMeadowJson);

/** Runtime adapter retained for the shared live-game movement engine. */
export const BUG_MARKET_MAP_V1 = toLiveGameMapDef(BUG_MARKET_MAP_V1_DOCUMENT);
