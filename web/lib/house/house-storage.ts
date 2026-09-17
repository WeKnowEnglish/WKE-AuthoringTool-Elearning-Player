import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { STARTER_HOUSE, normalizeHouseLayout } from "./house-normalize";
import type { HouseInteriorLayout } from "./house-types";

export const HOUSE_INTERIOR_STORAGE_KEY = "wke-house-interior-v1";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function storageKey(studentStorageId?: string): string {
  return scopedLocalStorageKey(
    HOUSE_INTERIOR_STORAGE_KEY,
    studentStorageId ?? resolveStudentStorageIdSync(),
  );
}

export function loadHouseLayout(studentStorageId?: string): HouseInteriorLayout {
  if (!canUseLocalStorage()) return STARTER_HOUSE;
  try {
    const raw = localStorage.getItem(storageKey(studentStorageId));
    if (!raw) return STARTER_HOUSE;
    return normalizeHouseLayout(JSON.parse(raw));
  } catch {
    return STARTER_HOUSE;
  }
}

export function saveHouseLayout(layout: HouseInteriorLayout, studentStorageId?: string): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(storageKey(studentStorageId), JSON.stringify(normalizeHouseLayout(layout)));
  } catch {
    // quota / private mode
  }
}

export function clearHouseLayout(studentStorageId?: string): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.removeItem(storageKey(studentStorageId));
  } catch {
    // ignore
  }
}

export function houseLayoutToJson(layout: HouseInteriorLayout): string {
  return `${JSON.stringify(normalizeHouseLayout(layout), null, 2)}\n`;
}

export function downloadHouseLayoutJson(layout: HouseInteriorLayout): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([houseLayoutToJson(layout)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "starter-house.json";
  link.click();
  URL.revokeObjectURL(url);
}
