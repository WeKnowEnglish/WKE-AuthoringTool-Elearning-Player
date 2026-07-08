import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { emptySnapshot, PROGRESS_STORAGE_KEY } from "@/lib/progress/types";

let cachedAuthUserId: string | null = null;

export function setStudentStorageIdCache(userId: string | null): void {
  cachedAuthUserId = userId?.trim() || null;
}

export function getCachedAuthUserId(): string | null {
  return cachedAuthUserId;
}

export function clearStudentStorageIdCache(): void {
  cachedAuthUserId = null;
}

function randomDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Read device id from legacy unscoped `wke-progress-v1` (hub bootstrap). */
export function readLegacyAnonymousDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { anonymousDeviceId?: unknown };
    const id =
      typeof parsed.anonymousDeviceId === "string" ? parsed.anonymousDeviceId.trim() : "";
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Stable guest / device id. Writes legacy unscoped progress when first created
 * so older hub code paths can still discover the device fingerprint.
 */
export function ensureGuestDeviceId(): string {
  const existing = readLegacyAnonymousDeviceId();
  if (existing) return existing;

  const next = randomDeviceId();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(emptySnapshot(next)));
    } catch {
      // ignore
    }
  }
  return next;
}

/**
 * Active student namespace for LocalStorage.
 * Authenticated → Supabase `user.id`; guest → hub `anonymousDeviceId`.
 */
export function resolveStudentStorageIdSync(): string {
  if (typeof window === "undefined") return "server";
  if (cachedAuthUserId) return cachedAuthUserId;
  return ensureGuestDeviceId();
}

export function getScopedProgressStorageKey(studentStorageId?: string): string {
  return scopedLocalStorageKey(
    PROGRESS_STORAGE_KEY,
    studentStorageId ?? resolveStudentStorageIdSync(),
  );
}
