import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import { loadCharacterConfig } from "@/lib/character/character-storage";
import type { CharacterConfig } from "@/lib/character/character-types";
import { kitFromCharacterConfig } from "@/lib/character/kit/kit-from-config";
import { loadCharacterKit } from "@/lib/character/kit/kit-storage";
import type { CharacterKitDocument } from "@/lib/character/kit/kit-types";

/** Match the old PlayKid visual height inside rooms. */
export const PLAY_AVATAR_HEIGHT = 1.15;
export const CHARACTER_MODEL_HEIGHT = 4.9;
export const PLAY_AVATAR_SCALE = PLAY_AVATAR_HEIGHT / CHARACTER_MODEL_HEIGHT;

export type PlayAvatarLook = {
  config: CharacterConfig;
  kit: CharacterKitDocument;
};

/** Outfit from the character editor + optional head kit from the kit studio. */
export function loadPlayAvatarLook(studentStorageId?: string): PlayAvatarLook {
  const config = loadCharacterConfig(studentStorageId) ?? DEFAULT_CHARACTER_CONFIG;
  const savedKit = loadCharacterKit(studentStorageId);
  const kit = savedKit
    ? {
        ...savedKit,
        skinColor: config.skinColor,
        hairColor: config.hairColor,
      }
    : kitFromCharacterConfig(config);
  return { config, kit };
}

export function outfitEditorHref(returnTo: string, surface: "student" | "pilot" = "student"): string {
  const next = encodeURIComponent(returnTo);
  return surface === "pilot" ? `/pilots/character-editor?next=${next}` : `/primary/world/outfit?next=${next}`;
}

export function faceEditorHref(returnTo: string, surface: "student" | "pilot" = "student"): string {
  const next = encodeURIComponent(returnTo);
  return surface === "pilot" ? `/pilots/character-kit?next=${next}` : `/primary/world/face?next=${next}`;
}

/** Only same-origin app paths — wardrobe return links. */
export function safeAppReturnHref(raw: string | undefined | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const value = decodeURIComponent(raw).trim();
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("://")) return value;
  } catch {
    // ignore
  }
  return fallback;
}
