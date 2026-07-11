import type { LiveGameModeConfig } from "@/lib/live-game/modes/types";

export const ENGLISH_CRAFT_MODE: LiveGameModeConfig = {
  id: "english_craft",
  title: "English Craft",
  subtitle: "Collect wood, craft a bridge, reach the flag together",
  defaultDurationMinutes: 20,
  defaultMapId: "english-craft-v1",
};

/** How much larger than full-screen the map is drawn (camera follows the player). */
export const ENGLISH_CRAFT_MAP_ZOOM = 1.85;
