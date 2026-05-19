import type { AvatarLoadout, AvatarPresetId } from "@/lib/avatar/types";

export const DEFAULT_AVATAR_LOADOUT: AvatarLoadout = {
  skin: "warm",
  hair: "default",
  top: "default",
  bottom: "default",
  shoes: "default",
  hat: null,
  accessory: null,
};

/** Legacy buddy id before alien replaced star. */
export const LEGACY_PRESET_ALIASES: Record<string, AvatarPresetId> = {
  star: "alien",
};

/** Layered SVG equip state per starter character. */
export const AVATAR_PRESET_LOADOUTS: Record<AvatarPresetId, AvatarLoadout> = {
  fox: {
    skin: "warm",
    hair: "fox",
    top: "fox",
    bottom: "default",
    shoes: "default",
    hat: null,
    accessory: "fox-snout",
  },
  robot: {
    skin: "cool",
    hair: "spiky",
    top: "robot",
    bottom: "shorts",
    shoes: "default",
    hat: null,
    accessory: null,
  },
  alien: {
    skin: "alien",
    hair: "alien",
    top: "alien",
    bottom: "alien",
    shoes: "default",
    hat: null,
    accessory: "alien-face",
  },
};

export const AVATAR_PRESETS = [
  { id: "fox" as const, label: "Fox", emoji: "🦊" },
  { id: "robot" as const, label: "Robot", emoji: "🤖" },
  { id: "alien" as const, label: "Alien", emoji: "👽" },
];

export function loadoutForPreset(presetId: AvatarPresetId): AvatarLoadout {
  return { ...AVATAR_PRESET_LOADOUTS[presetId] };
}

export function resolvePresetId(id: string): AvatarPresetId | null {
  if (id === "fox" || id === "robot" || id === "alien") return id;
  return LEGACY_PRESET_ALIASES[id] ?? null;
}
