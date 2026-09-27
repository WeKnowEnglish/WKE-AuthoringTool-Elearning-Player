import { FURNITURE } from "./house-catalog";
import { itemAabb } from "./house-grid";
import type { Aabb } from "@/lib/world/play-move";
import type { HouseInteriorLayout } from "./house-types";

export function furnitureWalls(layout: HouseInteriorLayout): Aabb[] {
  return layout.items.filter((item) => FURNITURE[item.kind].collide).map(itemAabb);
}
