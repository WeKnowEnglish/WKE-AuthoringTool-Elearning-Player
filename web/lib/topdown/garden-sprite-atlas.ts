import type { CropGrowthStage, GardenItemId } from "@/lib/garden/types";
import type {
  SpriteAtlasConfig,
  SpriteCategory,
  SpriteFrame,
  SpriteFrameDef,
  SpriteRect,
} from "@/lib/topdown/types";

export const GARDEN_SPRITE_ATLAS = {
  imageSrc: "/assets/language_garden_sheet.png",
  width: 1536,
  height: 1024,
  assets: {
    grass_plain: { sx: 12, sy: 10, sw: 230, sh: 230 },
    grass_flowers: { sx: 258, sy: 10, sw: 230, sh: 230 },
    grass_bush: { sx: 504, sy: 10, sw: 230, sh: 230 },

    soil_plain: { sx: 750, sy: 10, sw: 230, sh: 230 },
    soil_rocks: { sx: 996, sy: 10, sw: 230, sh: 230 },
    soil_tilled: { sx: 1242, sy: 10, sw: 230, sh: 230 },

    plant_sprout: { sx: 15, sy: 280, sw: 220, sh: 220 },
    plant_growing: { sx: 260, sy: 280, sw: 220, sh: 220 },
    plant_ready: { sx: 512, sy: 275, sw: 230, sh: 230 },

    item_watering_can: { sx: 18, sy: 538, sw: 210, sh: 210 },
    item_fertilizer: { sx: 262, sy: 532, sw: 220, sh: 230 },
    weed_monster: { sx: 505, sy: 528, sw: 235, sh: 235 },

    fence_end: { sx: 1290, sy: 292, sw: 195, sh: 210 },
    fence_horizontal: { sx: 1275, sy: 548, sw: 220, sh: 130 },
    fence_corner: { sx: 1290, sy: 785, sw: 195, sh: 195 },
  },
} as const satisfies SpriteAtlasConfig;

/** @deprecated Use GARDEN_SPRITE_ATLAS */
export const SPRITE_ATLAS = GARDEN_SPRITE_ATLAS;

export const SPRITE_SHEET_ID = "language-garden-sheet" as const;
export const SPRITE_SHEET_URL = GARDEN_SPRITE_ATLAS.imageSrc;
export const SPRITE_SHEET_WIDTH = GARDEN_SPRITE_ATLAS.width;
export const SPRITE_SHEET_HEIGHT = GARDEN_SPRITE_ATLAS.height;

export type GrassTileId = "grass_plain" | "grass_flowers" | "grass_bush";
export type SoilTileId = "soil_plain" | "soil_rocks" | "soil_tilled";
export type PlantStageId = "plant_sprout" | "plant_growing" | "plant_ready";
export type GardenItemSpriteId = "item_watering_can" | "item_fertilizer";
export type WeedSpriteId = "weed_monster";
export type FenceSpriteId = "fence_end" | "fence_horizontal" | "fence_corner";

export type SpriteFrameId =
  | GrassTileId
  | SoilTileId
  | PlantStageId
  | GardenItemSpriteId
  | WeedSpriteId
  | FenceSpriteId;

export type SpriteAtlasAssetKey = keyof typeof GARDEN_SPRITE_ATLAS.assets;

const FRAME_META: Record<
  SpriteFrameId,
  { label: string; category: SpriteCategory }
> = {
  grass_plain: { label: "Grass (plain)", category: "grass" },
  grass_flowers: { label: "Grass (flowers)", category: "grass" },
  grass_bush: { label: "Grass (bush)", category: "grass" },
  soil_plain: { label: "Soil (plain)", category: "soil" },
  soil_rocks: { label: "Soil (rocks)", category: "soil" },
  soil_tilled: { label: "Soil (tilled)", category: "soil" },
  plant_sprout: { label: "Plant — sprout", category: "plant" },
  plant_growing: { label: "Plant — growing", category: "plant" },
  plant_ready: { label: "Plant — ready", category: "plant" },
  item_watering_can: { label: "Watering can", category: "item" },
  item_fertilizer: { label: "Fertilizer", category: "item" },
  weed_monster: { label: "Purple weed monster", category: "weed" },
  fence_end: { label: "Fence — end post", category: "fence" },
  fence_horizontal: { label: "Fence — horizontal", category: "fence" },
  fence_corner: { label: "Fence — corner", category: "fence" },
};

function frameDef(id: SpriteFrameId): SpriteFrameDef {
  const bounds = GARDEN_SPRITE_ATLAS.assets[id];
  const meta = FRAME_META[id];
  return { id, ...meta, ...bounds };
}

function frame(id: SpriteFrameId): SpriteFrame {
  return GARDEN_SPRITE_ATLAS.assets[id];
}

export function getSpriteRect(id: SpriteFrameId): SpriteRect {
  return GARDEN_SPRITE_ATLAS.assets[id];
}

export const GRASS_TILE_FRAMES = {
  plain: frameDef("grass_plain"),
  flowers: frameDef("grass_flowers"),
  bush: frameDef("grass_bush"),
} as const satisfies Record<string, SpriteFrameDef>;

export const SOIL_TILE_FRAMES = {
  plain: frameDef("soil_plain"),
  rocks: frameDef("soil_rocks"),
  tilled: frameDef("soil_tilled"),
} as const satisfies Record<string, SpriteFrameDef>;

export const PLANT_STAGE_FRAMES = {
  sprout: frameDef("plant_sprout"),
  growing: frameDef("plant_growing"),
  ready: frameDef("plant_ready"),
} as const satisfies Record<string, SpriteFrameDef>;

export const GARDEN_ITEM_FRAMES = {
  watering_can: frameDef("item_watering_can"),
  fertilizer: frameDef("item_fertilizer"),
} as const satisfies Record<string, SpriteFrameDef>;

export const WEED_MONSTER_FRAME = frameDef("weed_monster");

export const FENCE_FRAMES = {
  end: frameDef("fence_end"),
  horizontal: frameDef("fence_horizontal"),
  corner: frameDef("fence_corner"),
} as const satisfies Record<string, SpriteFrameDef>;

export const PLANT_STAGE_SPRITES: Record<
  Exclude<CropGrowthStage, "empty">,
  SpriteFrame
> = {
  sprout: frame("plant_sprout"),
  growing: frame("plant_growing"),
  ready: frame("plant_ready"),
};

export const GARDEN_ITEM_SPRITES: Record<GardenItemId, SpriteFrame> = {
  watering_can: frame("item_watering_can"),
  fertilizer: frame("item_fertilizer"),
};

export const EMPTY_PLOT_SPRITE = frame("soil_tilled");
export const WEED_MONSTER_SPRITE = frame("weed_monster");

export const SPRITE_FRAME_CATALOG: readonly SpriteFrameDef[] = [
  GRASS_TILE_FRAMES.plain,
  GRASS_TILE_FRAMES.flowers,
  GRASS_TILE_FRAMES.bush,
  SOIL_TILE_FRAMES.plain,
  SOIL_TILE_FRAMES.rocks,
  SOIL_TILE_FRAMES.tilled,
  PLANT_STAGE_FRAMES.sprout,
  PLANT_STAGE_FRAMES.growing,
  PLANT_STAGE_FRAMES.ready,
  GARDEN_ITEM_FRAMES.watering_can,
  GARDEN_ITEM_FRAMES.fertilizer,
  WEED_MONSTER_FRAME,
  FENCE_FRAMES.end,
  FENCE_FRAMES.horizontal,
  FENCE_FRAMES.corner,
] as const;

export const SPRITE_FRAME_BY_ID: Record<SpriteFrameId, SpriteFrameDef> =
  Object.fromEntries(
    SPRITE_FRAME_CATALOG.map((entry) => [entry.id, entry]),
  ) as Record<SpriteFrameId, SpriteFrameDef>;

export const SPRITE_FRAMES_BY_CATEGORY: Record<
  SpriteCategory,
  readonly SpriteFrameDef[]
> = {
  grass: [
    GRASS_TILE_FRAMES.plain,
    GRASS_TILE_FRAMES.flowers,
    GRASS_TILE_FRAMES.bush,
  ],
  soil: [
    SOIL_TILE_FRAMES.plain,
    SOIL_TILE_FRAMES.rocks,
    SOIL_TILE_FRAMES.tilled,
  ],
  plant: [
    PLANT_STAGE_FRAMES.sprout,
    PLANT_STAGE_FRAMES.growing,
    PLANT_STAGE_FRAMES.ready,
  ],
  item: [GARDEN_ITEM_FRAMES.watering_can, GARDEN_ITEM_FRAMES.fertilizer],
  weed: [WEED_MONSTER_FRAME],
  fence: [FENCE_FRAMES.end, FENCE_FRAMES.horizontal, FENCE_FRAMES.corner],
};

export function getSpriteFrameById(id: string): SpriteFrameDef | undefined {
  return SPRITE_FRAME_BY_ID[id as SpriteFrameId];
}

export function formatSpriteFrameLabel(rect: SpriteRect): string {
  const match = SPRITE_FRAME_CATALOG.find(
    (entry) =>
      entry.sx === rect.sx &&
      entry.sy === rect.sy &&
      entry.sw === rect.sw &&
      entry.sh === rect.sh,
  );
  if (match) return match.label;
  return `(${rect.sx}, ${rect.sy}, ${rect.sw}×${rect.sh})`;
}
