import { describe, expect, it } from "vitest";
import {
  EMPTY_PLOT_SPRITE,
  FENCE_FRAMES,
  formatSpriteFrameLabel,
  GARDEN_ITEM_FRAMES,
  GARDEN_ITEM_SPRITES,
  GARDEN_SPRITE_ATLAS,
  getSpriteFrameById,
  getSpriteRect,
  GRASS_TILE_FRAMES,
  PLANT_STAGE_FRAMES,
  PLANT_STAGE_SPRITES,
  SOIL_TILE_FRAMES,
  spriteBackgroundPosition,
  spriteBackgroundSize,
  SPRITE_ATLAS,
  SPRITE_FRAME_CATALOG,
  SPRITE_SHEET_HEIGHT,
  SPRITE_SHEET_WIDTH,
  WEED_MONSTER_FRAME,
  WEED_MONSTER_SPRITE,
} from "@/lib/topdown/sprite-sheet-first-try";

describe("SPRITE_ATLAS", () => {
  it("points at the language garden sheet with known dimensions", () => {
    expect(SPRITE_ATLAS.imageSrc).toBe("/assets/language_garden_sheet.png");
    expect(SPRITE_ATLAS.width).toBe(1536);
    expect(SPRITE_ATLAS.height).toBe(1024);
    expect(SPRITE_SHEET_WIDTH).toBe(1536);
    expect(SPRITE_SHEET_HEIGHT).toBe(1024);
  });

  it("defines manual bounds for all 15 assets", () => {
    expect(Object.keys(SPRITE_ATLAS.assets)).toHaveLength(15);
  });
});

describe("manual pixel bounds", () => {
  it("uses user-tuned soil and plant coordinates", () => {
    expect(getSpriteRect("soil_plain")).toEqual({
      sx: 750,
      sy: 10,
      sw: 230,
      sh: 230,
    });
    expect(getSpriteRect("plant_sprout")).toEqual({
      sx: 15,
      sy: 280,
      sw: 220,
      sh: 220,
    });
    expect(getSpriteRect("plant_growing")).toEqual({
      sx: 260,
      sy: 280,
      sw: 220,
      sh: 220,
    });
    expect(getSpriteRect("plant_ready")).toEqual({
      sx: 512,
      sy: 275,
      sw: 230,
      sh: 230,
    });
  });

  it("keeps plant rows below grass/soil (sy > terrain sy)", () => {
    const terrainSy = getSpriteRect("grass_plain").sy;
    expect(getSpriteRect("plant_sprout").sy).toBeGreaterThan(terrainSy + 200);
    expect(getSpriteRect("plant_growing").sy).toBeGreaterThan(terrainSy + 200);
    expect(getSpriteRect("plant_ready").sy).toBeGreaterThan(terrainSy + 200);
  });

  it("defines tool and weed bounds on row 3", () => {
    expect(getSpriteRect("item_watering_can").sy).toBeGreaterThan(500);
    expect(getSpriteRect("item_fertilizer").sy).toBeGreaterThan(500);
    expect(getSpriteRect("weed_monster").sy).toBeGreaterThan(500);
  });
});

describe("SPRITE_FRAME_CATALOG", () => {
  it("lists all 15 frames with unique ids", () => {
    expect(SPRITE_FRAME_CATALOG).toHaveLength(15);
    const ids = SPRITE_FRAME_CATALOG.map((f) => f.id);
    expect(new Set(ids).size).toBe(15);
  });

  it("embeds manual bounds on every catalog entry", () => {
    for (const entry of SPRITE_FRAME_CATALOG) {
      expect(entry.sw).toBeGreaterThan(0);
      expect(entry.sh).toBeGreaterThan(0);
      expect(entry.sx).toBeGreaterThanOrEqual(0);
      expect(entry.sy).toBeGreaterThanOrEqual(0);
      expect(entry.sx + entry.sw).toBeLessThanOrEqual(SPRITE_SHEET_WIDTH);
      expect(entry.sy + entry.sh).toBeLessThanOrEqual(SPRITE_SHEET_HEIGHT);
    }
  });

  it("resolves frames by id", () => {
    expect(getSpriteFrameById("grass_plain")?.label).toBe("Grass (plain)");
    expect(getSpriteFrameById("fence_corner")?.sy).toBe(785);
    expect(getSpriteFrameById("not_a_frame")).toBeUndefined();
  });
});

describe("domain sprite lookups", () => {
  it("maps crop stages to manual plant rects", () => {
    expect(PLANT_STAGE_SPRITES.sprout).toEqual(getSpriteRect("plant_sprout"));
    expect(PLANT_STAGE_SPRITES.growing).toEqual(getSpriteRect("plant_growing"));
    expect(PLANT_STAGE_SPRITES.ready).toEqual(getSpriteRect("plant_ready"));
    expect(PLANT_STAGE_FRAMES.sprout.sw).toBe(220);
  });

  it("maps garden items to manual tool rects", () => {
    expect(GARDEN_ITEM_SPRITES.watering_can).toEqual(
      getSpriteRect("item_watering_can"),
    );
    expect(GARDEN_ITEM_SPRITES.fertilizer).toEqual(getSpriteRect("item_fertilizer"));
    expect(GARDEN_ITEM_FRAMES.watering_can.id).toBe("item_watering_can");
  });

  it("exposes empty plot and weed convenience sprites", () => {
    expect(EMPTY_PLOT_SPRITE).toEqual(getSpriteRect("soil_tilled"));
    expect(WEED_MONSTER_SPRITE).toEqual(getSpriteRect("weed_monster"));
    expect(WEED_MONSTER_FRAME.id).toBe("weed_monster");
  });
});

describe("CSS background helpers", () => {
  it("returns negative offsets from sx/sy", () => {
    expect(spriteBackgroundPosition(getSpriteRect("plant_growing"))).toBe(
      "-260px -280px",
    );
    expect(spriteBackgroundPosition(FENCE_FRAMES.corner)).toBe("-1290px -785px");
  });

  it("returns full sheet dimensions for background-size", () => {
    expect(spriteBackgroundSize(GARDEN_SPRITE_ATLAS)).toBe("1536px 1024px");
  });
});

describe("formatSpriteFrameLabel", () => {
  it("returns catalog labels when bounds match", () => {
    expect(formatSpriteFrameLabel(GRASS_TILE_FRAMES.flowers)).toBe(
      "Grass (flowers)",
    );
    expect(formatSpriteFrameLabel(WEED_MONSTER_FRAME)).toBe(
      "Purple weed monster",
    );
  });

  it("falls back to coordinate string for unknown rects", () => {
    expect(formatSpriteFrameLabel({ sx: 1, sy: 2, sw: 3, sh: 4 })).toBe(
      "(1, 2, 3×4)",
    );
  });
});

describe("terrain frames", () => {
  it("places grass on the left and soil on the right", () => {
    expect(GRASS_TILE_FRAMES.plain.sx).toBeLessThan(GRASS_TILE_FRAMES.bush.sx);
    expect(SOIL_TILE_FRAMES.plain.sx).toBeGreaterThan(GRASS_TILE_FRAMES.bush.sx);
    expect(SOIL_TILE_FRAMES.tilled.sx).toBeGreaterThan(SOIL_TILE_FRAMES.rocks.sx);
  });
});
