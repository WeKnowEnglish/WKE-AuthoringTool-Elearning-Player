import { DEFAULT_WORLD_PLACEMENTS, type WorldPlacement } from "./world-placements";

export const WORLD_PLACEMENT_STORAGE_KEY = "wke-world-placements-v1";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function mergeWorldPlacements(stored: unknown): WorldPlacement[] {
  const next = DEFAULT_WORLD_PLACEMENTS.map((placement) => ({ ...placement }));
  if (!Array.isArray(stored)) return next;
  const byId = new Map(next.map((placement) => [placement.id, placement]));
  for (const item of stored) {
    if (!item || typeof item !== "object") continue;
    const record = item as Partial<WorldPlacement>;
    if (typeof record.id !== "string") continue;
    const current = byId.get(record.id);
    if (!current) continue;
    if (isFiniteNumber(record.localX)) current.localX = record.localX;
    if (isFiniteNumber(record.localZ)) current.localZ = record.localZ;
    if (isFiniteNumber(record.scale)) current.scale = record.scale;
    if (isFiniteNumber(record.yaw)) current.yaw = record.yaw;
  }
  return next;
}

export function loadWorldPlacements(): WorldPlacement[] {
  if (typeof window === "undefined") return DEFAULT_WORLD_PLACEMENTS.map((placement) => ({ ...placement }));
  try {
    const raw = window.localStorage.getItem(WORLD_PLACEMENT_STORAGE_KEY);
    return mergeWorldPlacements(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_WORLD_PLACEMENTS.map((placement) => ({ ...placement }));
  }
}

export function saveWorldPlacements(placements: WorldPlacement[]): void {
  window.localStorage.setItem(WORLD_PLACEMENT_STORAGE_KEY, JSON.stringify(placements));
}
