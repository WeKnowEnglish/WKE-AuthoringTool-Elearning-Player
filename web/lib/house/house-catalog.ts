import { FURNITURE_IDS, type HouseFloorId, type HouseFurnitureId, type HouseWallId } from "./house-types";

export const HOUSE_GRID = 0.5;
export const HOUSE_MAX_ITEMS = 12;

export const FLOOR_OPTIONS: Array<{ id: HouseFloorId; label: string }> = [
  { id: "wood", label: "Wood" },
  { id: "checkers", label: "Checkers" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
];

export const WALL_OPTIONS: Array<{ id: HouseWallId; label: string }> = [
  { id: "stripes", label: "Stripes" },
  { id: "tan", label: "Tan" },
  { id: "mint", label: "Mint" },
  { id: "sky", label: "Sky" },
];

export const PAINT_COLORS: Record<string, string> = {
  blue: "#93c5fd",
  green: "#86efac",
  tan: "#e8d5b5",
  mint: "#bbf7d0",
  sky: "#bfdbfe",
};

export type FurnitureDef = {
  id: HouseFurnitureId;
  label: string;
  footprint: [number, number];
  collide: boolean;
  src?: string;
};

export const FURNITURE: Record<HouseFurnitureId, FurnitureDef> = {
  fridge: { id: "fridge", label: "Fridge", footprint: [1, 1.2], collide: true, src: "/world/props/kitchen/fridge.gltf" },
  bed: { id: "bed", label: "Bed", footprint: [2, 2.5], collide: true },
  table: { id: "table", label: "Table", footprint: [1.5, 1.5], collide: true },
  chair: { id: "chair", label: "Chair", footprint: [0.5, 0.5], collide: true },
  shelf: { id: "shelf", label: "Shelf", footprint: [1.5, 0.5], collide: true },
  plant: { id: "plant", label: "Plant", footprint: [0.5, 0.5], collide: true },
  rug: { id: "rug", label: "Rug", footprint: [2, 1.5], collide: false },
};

export const FURNITURE_LIST: FurnitureDef[] = FURNITURE_IDS.map((id) => FURNITURE[id]);
