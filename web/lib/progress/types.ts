import type { AvatarLoadout } from "@/lib/avatar/types";

export const PROGRESS_STORAGE_KEY = "wke-progress-v1";

export type ProgressSnapshotV1 = {
  schemaVersion: 1;
  anonymousDeviceId: string;
  completedLessonIds: string[];
  enrolledCourseIds?: string[];
  lessonResume?: Record<string, number>;
  audioMuted?: boolean;
  /** Layered SVG equip state. */
  avatarLoadout?: AvatarLoadout | null;
  /** @deprecated Migrated to {@link avatarLoadout}; legacy buddy preset id. */
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
    avatarLoadout: null,
    avatarId: null,
  };
}
