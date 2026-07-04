import { MAPS_STORAGE_KEY } from "@/lib/board-game/constants";
import { enrichMapEffects } from "@/lib/board-game/map/map-enrich";
import { validateBoardMap } from "@/lib/board-game/map/schema";
import type { CustomMapLibrary, CustomMapRecord } from "@/lib/board-game/map/library/types";

function emptyLibrary(): CustomMapLibrary {
  return { schemaVersion: 1, maps: {} };
}

function normalizeLibrary(raw: unknown): CustomMapLibrary {
  if (!raw || typeof raw !== "object") return emptyLibrary();
  const record = raw as CustomMapLibrary;
  if (record.schemaVersion !== 1 || !record.maps || typeof record.maps !== "object") {
    return emptyLibrary();
  }

  const maps: Record<string, CustomMapRecord> = {};
  for (const [id, entry] of Object.entries(record.maps)) {
    if (!entry || typeof entry !== "object") continue;
    if (typeof entry.title !== "string") continue;
    const map = validateBoardMap(entry.map);
    if (!map) continue;
    maps[id] = {
      id: entry.id ?? id,
      title: entry.title,
      map,
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
      sourcePresetId: typeof entry.sourcePresetId === "string" ? entry.sourcePresetId : undefined,
    };
  }

  return { schemaVersion: 1, maps };
}

export function readCustomMapLibrary(): CustomMapLibrary {
  if (typeof window === "undefined") return emptyLibrary();
  const raw = window.localStorage.getItem(MAPS_STORAGE_KEY);
  if (!raw) return emptyLibrary();
  try {
    return normalizeLibrary(JSON.parse(raw));
  } catch {
    return emptyLibrary();
  }
}

function writeLibrary(library: CustomMapLibrary): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(library));
}

export function listCustomMaps(): CustomMapRecord[] {
  const library = readCustomMapLibrary();
  return Object.values(library.maps).sort((a, b) => a.title.localeCompare(b.title));
}

export function readCustomMap(id: string): CustomMapRecord | null {
  return readCustomMapLibrary().maps[id] ?? null;
}

export function saveCustomMap(record: Omit<CustomMapRecord, "updatedAt"> & { updatedAt?: string }): CustomMapRecord {
  const validated = validateBoardMap(record.map);
  if (!validated) {
    throw new Error("Invalid board map. Could not save.");
  }

  const enriched = enrichMapEffects(validated);
  const next: CustomMapRecord = {
    id: record.id,
    title: record.title.trim() || "Untitled Map",
    map: { ...enriched, id: record.id, title: record.title.trim() || "Untitled Map" },
    updatedAt: record.updatedAt ?? new Date().toISOString(),
    sourcePresetId: record.sourcePresetId,
  };

  const library = readCustomMapLibrary();
  library.maps[next.id] = next;
  writeLibrary(library);
  return next;
}

export function deleteCustomMap(id: string): void {
  const library = readCustomMapLibrary();
  delete library.maps[id];
  writeLibrary(library);
}

export function duplicateCustomMap(id: string, newTitle: string): CustomMapRecord {
  const source = readCustomMap(id);
  if (!source) throw new Error("Map not found.");

  const newId = createCustomMapId();
  return saveCustomMap({
    id: newId,
    title: newTitle,
    map: {
      ...structuredClone(source.map),
      id: newId,
      title: newTitle,
    },
    sourcePresetId: source.sourcePresetId,
  });
}

export function isCustomMapId(id: string): boolean {
  return id.startsWith("custom-");
}

export function isBuiltInMapId(id: string): boolean {
  return !isCustomMapId(id);
}

export function createCustomMapId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
