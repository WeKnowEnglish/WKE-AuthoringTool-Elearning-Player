import type { LiveGameModuleDefinition } from "@/lib/live-game/modes/types";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import { ENGLISH_CRAFT_MAP_V1 } from "@/lib/live-game/modes/english-craft/map-v1";

export const ENGLISH_CRAFT_MODULE = {
  id: "english_craft",
  version: 1,
  status: "available",
  config: ENGLISH_CRAFT_MODE,
  maps: [ENGLISH_CRAFT_MAP_V1],
} as const satisfies LiveGameModuleDefinition;
