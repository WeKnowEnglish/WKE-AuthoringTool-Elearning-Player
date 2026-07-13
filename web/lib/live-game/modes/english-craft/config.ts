import type { LiveGameModeConfig } from "@/lib/live-game/modes/types";

export const ENGLISH_CRAFT_MODE: LiveGameModeConfig = {
  id: "english_craft",
  title: "English Craft",
  subtitle: "Gather resources, craft milestones, escape the island together",
  defaultDurationMinutes: 20,
  defaultMapId: "english-craft-v1",
};

export const ENGLISH_CRAFT_DURATION_OPTIONS = [1, 2, 5, 10, 15, 20, 30] as const;

export const ENGLISH_CRAFT_UNLIMITED_DURATION = null;

export type EnglishCraftDurationMinutes = (typeof ENGLISH_CRAFT_DURATION_OPTIONS)[number];

export type EnglishCraftSessionDuration = EnglishCraftDurationMinutes | null;

export function normalizeEnglishCraftDurationMinutes(
  minutes: number,
): EnglishCraftDurationMinutes {
  const rounded = Math.round(minutes);
  const match = ENGLISH_CRAFT_DURATION_OPTIONS.find((option) => option === rounded);
  if (match) return match;
  return ENGLISH_CRAFT_MODE.defaultDurationMinutes as EnglishCraftDurationMinutes;
}

export function formatEnglishCraftDurationSelectValue(
  duration: EnglishCraftSessionDuration,
): string {
  if (duration === null) return "unlimited";
  return String(duration);
}

export function parseEnglishCraftDurationSelectValue(
  value: string,
): EnglishCraftSessionDuration {
  if (value === "unlimited") return ENGLISH_CRAFT_UNLIMITED_DURATION;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return ENGLISH_CRAFT_MODE.defaultDurationMinutes as EnglishCraftDurationMinutes;
  }
  return normalizeEnglishCraftDurationMinutes(parsed);
}

export function isUnlimitedEnglishCraftDuration(
  duration: EnglishCraftSessionDuration,
): duration is null {
  return duration === null;
}

/** How much larger than full-screen the map is drawn (camera follows the player). */
export const ENGLISH_CRAFT_MAP_ZOOM = 1.85;
