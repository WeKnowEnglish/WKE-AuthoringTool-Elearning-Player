import { aabbFromCenter, type Aabb } from "@/lib/world/play-move";
import { FURNITURE, HOUSE_GRID } from "./house-catalog";
import type { HouseFurnitureId, HousePlacedItem, HouseRot } from "./house-types";

export const PLACE_ROOM: Aabb = { minX: -4.75, maxX: 4.75, minZ: -4.75, maxZ: 4.55 };

/** Keep the doorway clear so walk-around can still leave. */
export const DOOR_KEEPOUT: Aabb = { minX: -1.4, maxX: 1.4, minZ: 3.35, maxZ: 5.4 };

export function snapToGrid(value: number): number {
  return Math.round(value / HOUSE_GRID) * HOUSE_GRID;
}

export function rotatedFootprint(kind: HouseFurnitureId, rot: HouseRot): { w: number; d: number } {
  const [w, d] = FURNITURE[kind].footprint;
  return rot % 2 === 0 ? { w, d } : { w: d, d: w };
}

export function itemAabb(item: Pick<HousePlacedItem, "kind" | "x" | "z" | "rot">): Aabb {
  const { w, d } = rotatedFootprint(item.kind, item.rot);
  return aabbFromCenter(item.x, item.z, w, d, 0.04);
}

export function aabbsOverlap(a: Aabb, b: Aabb): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function aabbInside(inner: Aabb, outer: Aabb): boolean {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minZ >= outer.minZ && inner.maxZ <= outer.maxZ;
}

export function blocksDoor(box: Aabb): boolean {
  return aabbsOverlap(box, DOOR_KEEPOUT);
}

export function snapItem(kind: HouseFurnitureId, x: number, z: number, rot: HouseRot): { x: number; z: number } {
  const { w, d } = rotatedFootprint(kind, rot);
  const minX = snapToGrid(x - w / 2);
  const minZ = snapToGrid(z - d / 2);
  return { x: minX + w / 2, z: minZ + d / 2 };
}

export type PlaceFail = "door" | "room" | "overlap" | "full";

export function canPlaceItem(
  items: HousePlacedItem[],
  next: Pick<HousePlacedItem, "kind" | "x" | "z" | "rot" | "id">,
  maxItems = 12,
): PlaceFail | null {
  const box = itemAabb(next);
  if (!aabbInside(box, PLACE_ROOM)) return "room";
  if (blocksDoor(box)) return "door";
  const adding = !items.some((item) => item.id === next.id);
  if (adding && items.length >= maxItems) return "full";
  const collide = FURNITURE[next.kind].collide;
  if (collide) {
    const hits = items.some((item) => {
      if (item.id === next.id || !FURNITURE[item.kind].collide) return false;
      return aabbsOverlap(box, itemAabb(item));
    });
    if (hits) return "overlap";
  }
  return null;
}

export function nextRot(rot: HouseRot): HouseRot {
  return ((rot + 1) % 4) as HouseRot;
}
