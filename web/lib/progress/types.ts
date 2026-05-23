import type { AvatarLoadout } from "@/lib/avatar/types";
import type { LearningBand } from "@/lib/learning-band";

export const PROGRESS_STORAGE_KEY = "wke-progress-v1";

/** Placeholder player appearance until customizable player art ships. */
export type PlayerAppearanceId = "default";

/** Companion pet species (animated rig). */
export type PetKind = "dog";

export type ProgressSnapshotV1 = {
  schemaVersion: 1;
  anonymousDeviceId: string;
  completedLessonIds: string[];
  enrolledCourseIds?: string[];
  /** CEFR band chosen on the level landing page. */
  learningBand?: LearningBand | null;
  lessonResume?: Record<string, number>;
  audioMuted?: boolean;
  /** Active pet species; dog uses rig animations instead of loadout. */
  petKind?: PetKind | null;
  /** @deprecated Legacy layered SVG presets; migrated to {@link petKind}. */
  petLoadout?: AvatarLoadout | null;
  /** Player character appearance on home and world stage. */
  playerAppearanceId?: PlayerAppearanceId | null;
  /**
   * @deprecated Migrated to {@link petLoadout}. Kept for one-time migration reads.
   */
  avatarLoadout?: AvatarLoadout | null;
  /** @deprecated Migrated to {@link petLoadout}; legacy buddy preset id. */
  avatarId?: string | null;
};

export function emptySnapshot(deviceId: string): ProgressSnapshotV1 {
  return {
    schemaVersion: 1,
    anonymousDeviceId: deviceId,
    completedLessonIds: [],
    enrolledCourseIds: [],
    lessonResume: {},
    audioMuted: false,
    petKind: "dog",
    petLoadout: null,
    playerAppearanceId: "default",
    avatarLoadout: null,
    avatarId: null,
  };
}
