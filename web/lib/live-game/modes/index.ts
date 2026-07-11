import type {
  LiveGameMapDef,
  LiveGameModeConfig,
  LiveGameModeId,
} from "@/lib/live-game/modes/types";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import { ENGLISH_CRAFT_MAP_V1 } from "@/lib/live-game/modes/english-craft/map-v1";

export type { LiveGameMapDef, LiveGameModeConfig, LiveGameModeId, LiveGameSpawnPoint } from "@/lib/live-game/modes/types";

const MODES: Record<LiveGameModeId, LiveGameModeConfig> = {
  english_craft: ENGLISH_CRAFT_MODE,
};

const MAPS: Record<string, LiveGameMapDef> = {
  "english-craft-v1": ENGLISH_CRAFT_MAP_V1,
};

export function getModeConfig(modeId: LiveGameModeId): LiveGameModeConfig {
  return MODES[modeId];
}

export function getMapForMode(mapId: string, modeId: LiveGameModeId): LiveGameMapDef {
  const map = MAPS[mapId];
  if (!map || map.modeId !== modeId) {
    throw new Error(`Unknown map: ${mapId} for mode ${modeId}`);
  }
  return map;
}
