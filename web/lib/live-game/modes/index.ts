import type {
  LiveGameMapDef,
  LiveGameModeConfig,
  LiveGameModeId,
} from "@/lib/live-game/modes/types";
import { getLiveGameModule } from "@/lib/live-game/modes/registry";

export type {
  LiveGameMapDef,
  LiveGameModeConfig,
  LiveGameModeId,
  LiveGameModuleDefinition,
  LiveGameModuleStatus,
  LiveGameSpawnPoint,
} from "@/lib/live-game/modes/types";
export {
  getLiveGameModule,
  isLiveGameModeId,
  listAvailableLiveGameModules,
  listLiveGameModules,
} from "@/lib/live-game/modes/registry";

export function getModeConfig(modeId: LiveGameModeId): LiveGameModeConfig {
  return getLiveGameModule(modeId).config;
}

export function getMapForMode(mapId: string, modeId: LiveGameModeId): LiveGameMapDef {
  const map = getLiveGameModule(modeId).maps.find((candidate) => candidate.id === mapId);
  if (!map) {
    throw new Error(`Unknown map: ${mapId} for mode ${modeId}`);
  }
  return map;
}
