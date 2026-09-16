import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { normalizeCharacterConfig } from "./character-normalize";
import type { CharacterConfig } from "./character-types";

export const CHARACTER_STORAGE_KEY = "wke-character-config-v1";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function storageKey(studentStorageId?: string): string {
  return scopedLocalStorageKey(
    CHARACTER_STORAGE_KEY,
    studentStorageId ?? resolveStudentStorageIdSync(),
  );
}

/**
 * Persistence boundary for the student avatar.
 * Swap the localStorage body later for Supabase without touching editor UI.
 */
export function loadCharacterConfig(studentStorageId?: string): CharacterConfig | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(storageKey(studentStorageId));
    if (!raw) return null;
    return normalizeCharacterConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCharacterConfig(config: CharacterConfig, studentStorageId?: string): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(storageKey(studentStorageId), JSON.stringify(normalizeCharacterConfig(config)));
  } catch {
    // Quota / private mode — editor still works in memory.
  }
}

export function clearCharacterConfig(studentStorageId?: string): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.removeItem(storageKey(studentStorageId));
  } catch {
    // ignore
  }
}
