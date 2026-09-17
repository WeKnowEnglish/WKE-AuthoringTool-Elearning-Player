import { snapItem } from "./house-grid";
import starterHouse from "./recipes/starter-house.json";
import {
  FLOOR_IDS,
  FURNITURE_IDS,
  HOUSE_INTERIOR_FORMAT,
  HOUSE_INTERIOR_VERSION,
  WALL_IDS,
  type HouseFloorId,
  type HouseInteriorLayout,
  type HousePlacedItem,
  type HouseRot,
  type HouseWallId,
} from "./house-types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const id = asString(value);
  return id && (allowed as readonly string[]).includes(id) ? (id as T) : fallback;
}

function asRot(value: unknown): HouseRot {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 0) return n;
  return 0;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asId(value: unknown, fallback: string): string {
  return asString(value) ?? fallback;
}

function asItem(raw: unknown, index: number): HousePlacedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<HousePlacedItem>;
  const kindRaw = asString(source.kind);
  if (!kindRaw || !(FURNITURE_IDS as readonly string[]).includes(kindRaw)) return null;
  const kind = kindRaw as HousePlacedItem["kind"];
  const rot = asRot(source.rot);
  const snapped = snapItem(kind, asNumber(source.x, 0), asNumber(source.z, 0), rot);
  return {
    id: asId(source.id, `item-${index}`),
    kind,
    x: snapped.x,
    z: snapped.z,
    rot,
  };
}

export const STARTER_HOUSE: HouseInteriorLayout = normalizeHouseLayout(starterHouse);

export function normalizeHouseLayout(raw: unknown): HouseInteriorLayout {
  const source = raw && typeof raw === "object" ? (raw as Partial<HouseInteriorLayout> & { items?: unknown }) : {};
  const rawItems = Array.isArray(source.items) ? source.items : starterHouse.items;
  const items = rawItems
    .map(asItem)
    .filter((item): item is HousePlacedItem => item != null)
    .slice(0, 12);
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return {
    format: HOUSE_INTERIOR_FORMAT,
    version: HOUSE_INTERIOR_VERSION,
    floor: oneOf(source.floor, FLOOR_IDS, "wood") as HouseFloorId,
    walls: oneOf(source.walls, WALL_IDS, "stripes") as HouseWallId,
    items: unique,
  };
}
