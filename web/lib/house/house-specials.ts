import { FURNITURE } from "./house-catalog";
import { canPlaceItem } from "./house-grid";
import { STARTER_HOUSE } from "./house-normalize";
import type { HouseInteriorLayout, HousePlacedItem } from "./house-types";

export const WARDROBE_ENTER_RADIUS = 2.1;

/** Stand in front of the wardrobe doors (local +Z of the mesh). */
export function wardrobeApproach(item: HousePlacedItem): { x: number; z: number } {
  const depth = FURNITURE.wardrobe.footprint[1];
  const reach = depth / 2 + 0.85;
  const yaw = item.rot * (Math.PI / 2);
  return {
    x: item.x + Math.sin(yaw) * reach,
    z: item.z + Math.cos(yaw) * reach,
  };
}

export function wardrobeItems(layout: HouseInteriorLayout): HousePlacedItem[] {
  return layout.items.filter((item) => item.kind === "wardrobe");
}

/** Older saves may predate the wardrobe — drop in the starter one when it fits. */
export function ensureWardrobe(layout: HouseInteriorLayout): HouseInteriorLayout {
  if (wardrobeItems(layout).length > 0) return layout;
  const starter = STARTER_HOUSE.items.find((item) => item.kind === "wardrobe");
  if (!starter) return layout;
  if (canPlaceItem(layout.items, starter) != null) return layout;
  return { ...layout, items: [...layout.items, { ...starter, id: "starter-wardrobe" }] };
}

export function nearWardrobe(
  layout: HouseInteriorLayout,
  x: number,
  z: number,
  radius = WARDROBE_ENTER_RADIUS,
): boolean {
  for (const item of wardrobeItems(layout)) {
    const point = wardrobeApproach(item);
    if (Math.hypot(x - point.x, z - point.z) <= radius) return true;
    if (Math.hypot(x - item.x, z - item.z) <= radius) return true;
  }
  return false;
}

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
