import { normalizeLoadout } from "@/lib/avatar/apply-loadout";
import { resolveAvatarLoadout } from "@/lib/avatar/progress";
import type { PlayerAppearanceId, ProgressSnapshotV1 } from "@/lib/progress/types";

const DEFAULT_PLAYER_APPEARANCE: PlayerAppearanceId = "default";

export function isPlayerAppearanceId(value: unknown): value is PlayerAppearanceId {
  return value === "default";
}

/** One-time fields: legacy avatar → pet, default player appearance. */
export function migrateProgressSnapshotFields(snapshot: ProgressSnapshotV1): {
  snapshot: ProgressSnapshotV1;
  changed: boolean;
} {
  let changed = false;
  const next: ProgressSnapshotV1 = { ...snapshot };

  if (next.petLoadout) {
    const normalized = normalizeLoadout(next.petLoadout);
    if (JSON.stringify(normalized) !== JSON.stringify(next.petLoadout)) {
      next.petLoadout = normalized;
      changed = true;
    }
  } else if (next.avatarLoadout || next.avatarId) {
    next.petLoadout = resolveAvatarLoadout(next.avatarLoadout, next.avatarId);
    changed = true;
  }

  if (!isPlayerAppearanceId(next.playerAppearanceId)) {
    next.playerAppearanceId = DEFAULT_PLAYER_APPEARANCE;
    changed = true;
  }

  return { snapshot: next, changed };
}
