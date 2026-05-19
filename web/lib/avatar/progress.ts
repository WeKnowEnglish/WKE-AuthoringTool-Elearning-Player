import {
  AVATAR_PRESET_LOADOUTS,
  DEFAULT_AVATAR_LOADOUT,
  loadoutForPreset,
  resolvePresetId,
} from "@/lib/avatar/defaults";
import { normalizeLoadout } from "@/lib/avatar/apply-loadout";
import type { AvatarLoadout, AvatarPresetId } from "@/lib/avatar/types";

/** Merge stored loadout with legacy `avatarId` buddy pick. */
export function resolveAvatarLoadout(
  avatarLoadout: unknown,
  avatarId: string | null | undefined,
): AvatarLoadout {
  if (avatarLoadout && typeof avatarLoadout === "object") {
    return migrateLegacyLoadout(avatarLoadout as AvatarLoadout);
  }
  const preset = avatarId ? resolvePresetId(avatarId) : null;
  if (preset) {
    return loadoutForPreset(preset);
  }
  return { ...DEFAULT_AVATAR_LOADOUT };
}

export function presetIdForLoadout(loadout: AvatarLoadout): AvatarPresetId | null {
  const normalized = normalizeLoadout(loadout);
  for (const [id, preset] of Object.entries(AVATAR_PRESET_LOADOUTS) as [
    AvatarPresetId,
    AvatarLoadout,
  ][]) {
    if (loadoutsEqual(normalized, preset)) return id;
  }
  return null;
}

/** Upgrade stored loadouts that reference removed SVG items or old fox preset. */
export function migrateLegacyLoadout(loadout: AvatarLoadout): AvatarLoadout {
  const n = normalizeLoadout(loadout);
  if (n.top === "star") {
    return loadoutForPreset("alien");
  }
  if (n.top === "fox" && n.hair === "default" && n.accessory === null) {
    return loadoutForPreset("fox");
  }
  return n;
}

function loadoutsEqual(a: AvatarLoadout, b: AvatarLoadout): boolean {
  return (
    a.skin === b.skin &&
    a.hair === b.hair &&
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.shoes === b.shoes &&
    a.hat === b.hat &&
    a.accessory === b.accessory
  );
}
