import { toLiveGameMapDef } from "@/lib/live-game/modes/bug-market/map-schema";
import { BUG_MARKET_MAP_DOCUMENTS_BY_ID } from "@/lib/live-game/modes/bug-market/maps";

/** Serializable source document that the future map editor will read and write. */
export const BUG_MARKET_MAP_V1_DOCUMENT = BUG_MARKET_MAP_DOCUMENTS_BY_ID.get("bug-market-v1")!;

/** Runtime adapter retained for the shared live-game movement engine. */
export const BUG_MARKET_MAP_V1 = toLiveGameMapDef(BUG_MARKET_MAP_V1_DOCUMENT);
