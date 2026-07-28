import type { LiveGameModuleDefinition } from "@/lib/live-game/modes/types";
import { BUG_MARKET_MODE } from "@/lib/live-game/modes/bug-market/config";
import { BUG_MARKET_MAP_V1 } from "@/lib/live-game/modes/bug-market/map-v1";

/** First playable Bug Market module: lobby, movement, catching, and display case. */
export const BUG_MARKET_MODULE = {
  id: "bug_market",
  version: 1,
  status: "available",
  config: BUG_MARKET_MODE,
  maps: [BUG_MARKET_MAP_V1],
} as const satisfies LiveGameModuleDefinition;
