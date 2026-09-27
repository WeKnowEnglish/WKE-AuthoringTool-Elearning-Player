import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import { loadCharacterConfig } from "@/lib/character/character-storage";
import type { CharacterConfig } from "@/lib/character/character-types";

/** Match a readable kid height inside rooms (CharacterModel is ~4.9 tall). */
export const PLAY_AVATAR_HEIGHT = 1.28;
export const CHARACTER_MODEL_HEIGHT = 4.9;
export const PLAY_AVATAR_SCALE = PLAY_AVATAR_HEIGHT / CHARACTER_MODEL_HEIGHT;

export type PlayAvatarLook = {
  config: CharacterConfig;
};

/** Saved colors/slots for the sole live WKE girl base. */
export function loadPlayAvatarLook(studentStorageId?: string): PlayAvatarLook {
  const config = loadCharacterConfig(studentStorageId) ?? DEFAULT_CHARACTER_CONFIG;
  return { config };
}

export function outfitEditorHref(returnTo: string, surface: "student" | "pilot" = "student"): string {
  const next = encodeURIComponent(returnTo);
  return surface === "pilot" ? `/pilots/character-editor?next=${next}` : `/primary/world/outfit?next=${next}`;
}

export function faceEditorHref(returnTo: string, surface: "student" | "pilot" = "student"): string {
  if (surface === "pilot") {
    return `/pilots/character-kit?next=${encodeURIComponent(returnTo)}`;
  }
  return outfitEditorHref(returnTo, surface);
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
