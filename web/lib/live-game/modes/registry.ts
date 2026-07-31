import { BUG_MARKET_MODULE } from "@/lib/live-game/modes/bug-market/definition";
import { ENGLISH_CRAFT_MODULE } from "@/lib/live-game/modes/english-craft/definition";
import type {
  LiveGameModeId,
  LiveGameModuleDefinition,
} from "@/lib/live-game/modes/types";

const LIVE_GAME_MODULES = {
  english_craft: ENGLISH_CRAFT_MODULE,
  bug_market: BUG_MARKET_MODULE,
} as const satisfies Record<LiveGameModeId, LiveGameModuleDefinition>;

export function isLiveGameModeId(value: string): value is LiveGameModeId {
  return value in LIVE_GAME_MODULES;
}

export function getLiveGameModule(modeId: LiveGameModeId): LiveGameModuleDefinition {
  return LIVE_GAME_MODULES[modeId];
}

export function listLiveGameModules(): readonly LiveGameModuleDefinition[] {
  return Object.values(LIVE_GAME_MODULES);
}

export function listAvailableLiveGameModules(): readonly LiveGameModuleDefinition[] {
  return listLiveGameModules().filter((module) => module.status === "available");
}
