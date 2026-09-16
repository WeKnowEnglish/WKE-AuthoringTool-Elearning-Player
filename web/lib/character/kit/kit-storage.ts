import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { normalizeCharacterKit } from "./kit-normalize";
import type { CharacterKitDocument } from "./kit-types";

export const CHARACTER_KIT_STORAGE_KEY = "wke-character-kit-v1";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function storageKey(studentStorageId?: string): string {
  return scopedLocalStorageKey(
    CHARACTER_KIT_STORAGE_KEY,
    studentStorageId ?? resolveStudentStorageIdSync(),
  );
}

export function loadCharacterKit(studentStorageId?: string): CharacterKitDocument | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(storageKey(studentStorageId));
    if (!raw) return null;
    return normalizeCharacterKit(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCharacterKit(kit: CharacterKitDocument, studentStorageId?: string): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(storageKey(studentStorageId), JSON.stringify(normalizeCharacterKit(kit)));
  } catch {
    // ignore
  }
}

export function kitToPrettyJson(kit: CharacterKitDocument): string {
  return `${JSON.stringify(normalizeCharacterKit(kit), null, 2)}\n`;
}

export function kitFromJson(text: string): CharacterKitDocument {
  return normalizeCharacterKit(JSON.parse(text));
}
