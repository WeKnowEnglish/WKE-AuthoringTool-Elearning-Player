export const HOUSE_INTERIOR_FORMAT = "wke-house-interior" as const;
export const HOUSE_INTERIOR_VERSION = 1;

export const HOUSE_TABS = ["floor", "walls", "stuff"] as const;
export type HouseTab = (typeof HOUSE_TABS)[number];

export const FLOOR_IDS = ["wood", "checkers", "blue", "green"] as const;
export type HouseFloorId = (typeof FLOOR_IDS)[number];

export const WALL_IDS = ["stripes", "tan", "mint", "sky"] as const;
export type HouseWallId = (typeof WALL_IDS)[number];

export const FURNITURE_IDS = ["fridge", "wardrobe", "bed", "table", "chair", "shelf", "plant", "rug"] as const;
export type HouseFurnitureId = (typeof FURNITURE_IDS)[number];

export const CAMERA_PRESETS = ["door", "corner", "top"] as const;
export type HouseCameraPreset = (typeof CAMERA_PRESETS)[number];

export type HouseRot = 0 | 1 | 2 | 3;

export type HousePlacedItem = {
  id: string;
  kind: HouseFurnitureId;
  x: number;
  z: number;
  rot: HouseRot;
};

export type HouseInteriorLayout = {
  format: typeof HOUSE_INTERIOR_FORMAT;
  version: typeof HOUSE_INTERIOR_VERSION;
  floor: HouseFloorId;
  walls: HouseWallId;
  items: HousePlacedItem[];
};

export type HouseDesignerCamera = {
  preset: HouseCameraPreset;
  turn: number;
  zoom: 0 | 1 | 2;
};
