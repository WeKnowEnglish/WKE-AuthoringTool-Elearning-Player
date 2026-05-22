import { resolveAvatarLoadout } from "@/lib/avatar/progress";
import type { AvatarLoadout } from "@/lib/avatar/types";
import type { ProgressSnapshotV1 } from "@/lib/progress/types";

/** Resolve pet loadout from snapshot fields (pet first, then legacy avatar). */
export function resolvePetLoadoutFromSnapshot(
  snapshot: Pick<ProgressSnapshotV1, "petLoadout" | "avatarLoadout" | "avatarId">,
): AvatarLoadout | null {
  if (snapshot.petLoadout) return snapshot.petLoadout;
  if (!snapshot.avatarLoadout && !snapshot.avatarId) return null;
  return resolveAvatarLoadout(snapshot.avatarLoadout, snapshot.avatarId);
}
