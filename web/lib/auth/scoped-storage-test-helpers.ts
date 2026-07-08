import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { clearStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import { resetStudentStorageMigrationMemo } from "@/lib/auth/student-storage-migrate";
import { REWARDS_STORAGE_KEY, type RewardsSnapshot } from "@/lib/progress/rewards";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";

export const SCOPED_STORAGE_TEST_DEVICE_ID = "test-device";

export function resetScopedStorageTestState() {
  clearStudentStorageIdCache();
  resetStudentStorageMigrationMemo();
}

export function seedScopedProgressHub(deviceId = SCOPED_STORAGE_TEST_DEVICE_ID) {
  localStorage.setItem(
    PROGRESS_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      anonymousDeviceId: deviceId,
      completedLessonIds: [],
    }),
  );
}

export function seedScopedRewards(
  snapshot: Partial<RewardsSnapshot> = {},
  deviceId = SCOPED_STORAGE_TEST_DEVICE_ID,
) {
  seedScopedProgressHub(deviceId);
  localStorage.setItem(
    scopedLocalStorageKey(REWARDS_STORAGE_KEY, deviceId),
    JSON.stringify({
      gold: 0,
      experience: 0,
      rewardedEventIds: [],
      ownedStickerIds: [],
      quizEnergy: 0,
      quizStreak: 0,
      ...snapshot,
    }),
  );
}
