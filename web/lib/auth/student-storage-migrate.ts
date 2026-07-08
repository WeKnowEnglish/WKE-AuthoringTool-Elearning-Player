import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import {
  ensureGuestDeviceId,
  readLegacyAnonymousDeviceId,
} from "@/lib/auth/student-storage-id";
import { REWARDS_STORAGE_KEY } from "@/lib/progress/rewards";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";
import { LOCAL_ACTIVITY_STORAGE_KEY_PREFIX } from "@/lib/secondary/local-activity-store";
import {
  COMPLETION_STORAGE_KEY_PREFIX,
  SESSION_STORAGE_KEY_PREFIX,
  WORD_PROGRESS_STORAGE_KEY_PREFIX,
} from "@/lib/secondary/secondary-student-id";

const MASTERY_STORAGE_KEY = "wke-student-mastery-v1";
const MASTERY_EVIDENCE_STORAGE_KEY = "wke-learning-evidence-v1";

const CORE_BASE_KEYS = [
  PROGRESS_STORAGE_KEY,
  REWARDS_STORAGE_KEY,
  MASTERY_STORAGE_KEY,
  MASTERY_EVIDENCE_STORAGE_KEY,
] as const;

const PREFIXED_SECONDARY_KEYS = [
  WORD_PROGRESS_STORAGE_KEY_PREFIX,
  SESSION_STORAGE_KEY_PREFIX,
  COMPLETION_STORAGE_KEY_PREFIX,
  LOCAL_ACTIVITY_STORAGE_KEY_PREFIX,
] as const;

const migratedTargets = new Set<string>();

/** Test-only reset for module migration memo. */
export function resetStudentStorageMigrationMemo(): void {
  migratedTargets.clear();
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function copyIfMissing(fromKey: string, toKey: string): void {
  if (!canUseLocalStorage() || fromKey === toKey) return;
  try {
    if (localStorage.getItem(toKey)) return;
    const value = localStorage.getItem(fromKey);
    if (value == null) return;
    localStorage.setItem(toKey, value);
  } catch {
    // ignore
  }
}

function listLocalStorageKeys(): string[] {
  const keys: string[] = [];
  if (!canUseLocalStorage()) return keys;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
  } catch {
    // ignore
  }
  return keys;
}

function migratePrefixedKeys(fromId: string, toId: string): void {
  if (!canUseLocalStorage() || fromId === toId) return;

  for (const key of listLocalStorageKeys()) {
    for (const prefix of PREFIXED_SECONDARY_KEYS) {
      const fromExact = `${prefix}${fromId}`;
      const fromPrefix = `${prefix}${fromId}:`;
      if (key !== fromExact && !key.startsWith(fromPrefix)) continue;

      const suffix = key.slice(`${prefix}${fromId}`.length);
      const toKey = `${prefix}${toId}${suffix}`;
      copyIfMissing(key, toKey);
    }
  }
}

function migrateCoreKeys(targetId: string, deviceId: string): void {
  for (const baseKey of CORE_BASE_KEYS) {
    copyIfMissing(baseKey, scopedLocalStorageKey(baseKey, targetId));
    if (deviceId !== targetId) {
      copyIfMissing(
        scopedLocalStorageKey(baseKey, deviceId),
        scopedLocalStorageKey(baseKey, targetId),
      );
    }
  }
  migratePrefixedKeys(deviceId, targetId);
}

/**
 * One-time copy of legacy guest/device data into an authenticated namespace.
 * Call only on explicit sign-in (not sign-up). Safe to call repeatedly (no overwrite).
 */
export function migrateLocalStorageToStudentStorageId(targetId: string): void {
  if (!canUseLocalStorage() || !targetId || targetId === "server") return;
  if (migratedTargets.has(targetId)) return;

  const deviceId = readLegacyAnonymousDeviceId() ?? ensureGuestDeviceId();
  migrateCoreKeys(targetId, deviceId);
  migratedTargets.add(targetId);
}
