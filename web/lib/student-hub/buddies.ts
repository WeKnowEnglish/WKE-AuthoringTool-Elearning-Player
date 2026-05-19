/** @deprecated Use `@/lib/avatar` presets instead. */
export { AVATAR_PRESETS as STUDENT_BUDDIES } from "@/lib/avatar/defaults";
export type { AvatarPresetId as StudentBuddyId } from "@/lib/avatar/types";

import { AVATAR_PRESETS } from "@/lib/avatar/defaults";

/** @deprecated Use `StudentAvatar` instead. */
export function buddyEmojiForId(id: string | null | undefined): string {
  return AVATAR_PRESETS.find((b) => b.id === id)?.emoji ?? "⭐";
}
