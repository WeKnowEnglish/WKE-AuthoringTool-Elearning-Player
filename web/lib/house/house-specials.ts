import { FURNITURE } from "./house-catalog";
import { canPlaceItem } from "./house-grid";
import { STARTER_HOUSE } from "./house-normalize";
import type { HouseFurnitureId, HouseInteriorLayout, HousePlacedItem } from "./house-types";

export const FURNITURE_ENTER_RADIUS = 2.1;

/** Stand in front of the item's local +Z face. */
export function furnitureApproach(item: HousePlacedItem, reachExtra = 0.85): { x: number; z: number } {
  const depth = FURNITURE[item.kind].footprint[1];
  const reach = depth / 2 + reachExtra;
  const yaw = item.rot * (Math.PI / 2);
  return {
    x: item.x + Math.sin(yaw) * reach,
    z: item.z + Math.cos(yaw) * reach,
  };
}

export function furnitureOfKind(layout: HouseInteriorLayout, kind: HouseFurnitureId): HousePlacedItem[] {
  return layout.items.filter((item) => item.kind === kind);
}

export function wardrobeApproach(item: HousePlacedItem): { x: number; z: number } {
  return furnitureApproach(item);
}

export function wardrobeItems(layout: HouseInteriorLayout): HousePlacedItem[] {
  return furnitureOfKind(layout, "wardrobe");
}

export function fridgeItems(layout: HouseInteriorLayout): HousePlacedItem[] {
  return furnitureOfKind(layout, "fridge");
}

/** Older saves may predate the wardrobe — drop in the starter one when it fits. */
export function ensureWardrobe(layout: HouseInteriorLayout): HouseInteriorLayout {
  if (wardrobeItems(layout).length > 0) return layout;
  const starter = STARTER_HOUSE.items.find((item) => item.kind === "wardrobe");
  if (!starter) return layout;
  if (canPlaceItem(layout.items, starter) != null) return layout;
  return { ...layout, items: [...layout.items, { ...starter, id: "starter-wardrobe" }] };
}

/** Keep fridge present for the kitchen English hotspot. */
export function ensureFridge(layout: HouseInteriorLayout): HouseInteriorLayout {
  if (fridgeItems(layout).length > 0) return layout;
  const starter = STARTER_HOUSE.items.find((item) => item.kind === "fridge");
  if (!starter) return layout;
  if (canPlaceItem(layout.items, starter) != null) return layout;
  return { ...layout, items: [...layout.items, { ...starter, id: "starter-fridge" }] };
}

export function ensureHouseSpecials(layout: HouseInteriorLayout): HouseInteriorLayout {
  return ensureFridge(ensureWardrobe(layout));
}

export function nearFurnitureKind(
  layout: HouseInteriorLayout,
  kind: HouseFurnitureId,
  x: number,
  z: number,
  radius = FURNITURE_ENTER_RADIUS,
): boolean {
  for (const item of furnitureOfKind(layout, kind)) {
    const point = furnitureApproach(item);
    if (Math.hypot(x - point.x, z - point.z) <= radius) return true;
    if (Math.hypot(x - item.x, z - item.z) <= radius) return true;
  }
  return false;
}

export function nearWardrobe(
  layout: HouseInteriorLayout,
  x: number,
  z: number,
  radius = FURNITURE_ENTER_RADIUS,
): boolean {
  return nearFurnitureKind(layout, "wardrobe", x, z, radius);
}

export function nearFridge(
  layout: HouseInteriorLayout,
  x: number,
  z: number,
  radius = FURNITURE_ENTER_RADIUS,
): boolean {
  return nearFurnitureKind(layout, "fridge", x, z, radius);
}

/** @deprecated use FURNITURE_ENTER_RADIUS */
export const WARDROBE_ENTER_RADIUS = FURNITURE_ENTER_RADIUS;

export function nearestWardrobeApproach(
  layout: HouseInteriorLayout,
  x: number,
  z: number,
): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null;
  let bestDist = Infinity;
  for (const item of wardrobeItems(layout)) {
    const point = wardrobeApproach(item);
    const dist = Math.hypot(x - point.x, z - point.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }
  return best;
}
